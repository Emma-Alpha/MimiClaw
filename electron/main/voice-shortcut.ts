import { app, globalShortcut } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { logger } from '../utils/logger';
import { getPetRuntimeState } from './pet-runtime';
import { getPetWindow } from './pet-window';

type VoiceRecordingAction = 'start' | 'confirm' | 'cancel';
const VOICE_FALLBACK_SHORTCUT = 'F2';

const FN_MONITOR_SOURCE = `import Cocoa

var fnDown = false
var modifierState: CGEventFlags = []
var tapPort: CFMachPort?

let modifierKeycodes: [Int64: String] = [
    63: "Fn",
    58: "Alt", 61: "Alt",
    56: "Shift", 60: "Shift",
    59: "Control", 62: "Control",
    55: "Meta", 54: "Meta",
]

let modifierFlags: [(CGEventFlags.Element, String)] = [
    (.maskSecondaryFn, "Fn"),
    (.maskAlternate, "Alt"),
    (.maskShift, "Shift"),
    (.maskControl, "Control"),
    (.maskCommand, "Meta"),
]

func myCGEventCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {

    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let port = tapPort {
            CGEvent.tapEnable(tap: port, enable: true)
        }
        return Unmanaged.passRetained(event)
    }

    let keycode = event.getIntegerValueField(.keyboardEventKeycode)

    if type == .keyDown || type == .keyUp {
        let phase = type == .keyDown ? "down" : "up"
        var chars = ""
        if let nsEvent = NSEvent(cgEvent: event) {
            chars = nsEvent.charactersIgnoringModifiers ?? ""
        }
        let escapedChars = chars
            .replacingOccurrences(of: "\\n", with: "\\\\n")
            .replacingOccurrences(of: "\\r", with: "\\\\r")
            .replacingOccurrences(of: "\\t", with: "\\\\t")
        print("raw:key:\\(phase):keycode=\\(keycode):chars=\\(escapedChars)")
        fflush(stdout)
        return Unmanaged.passRetained(event)
    }

    if type == .flagsChanged {
        let newFlags = event.flags
        var modifierNames: [String] = []
        for (flag, name) in modifierFlags {
            if newFlags.contains(flag) {
                modifierNames.append(name)
            }
        }
        let flagsDescription = modifierNames.isEmpty ? "none" : modifierNames.joined(separator: "+")
        let rawModifier = modifierKeycodes[keycode] ?? "unknown"
        print("raw:flagsChanged:keycode=\\(keycode):modifier=\\(rawModifier):flags=\\(flagsDescription)")
        fflush(stdout)

        if let modName = modifierKeycodes[keycode] {
            for (flag, name) in modifierFlags {
                if name != modName { continue }
                let wasSet = modifierState.contains(flag)
                let isSet = newFlags.contains(flag)

                if isSet && !wasSet {
                    print("key:down:\\(modName)")
                    fflush(stdout)
                    modifierState = newFlags

                    if modName == "Fn" {
                        fnDown = true
                        var cleaned = event.flags
                        cleaned.remove(.maskSecondaryFn)
                        event.flags = cleaned
                        return Unmanaged.passRetained(event)
                    }
                    return Unmanaged.passRetained(event)
                } else if !isSet && wasSet {
                    print("key:up:\\(modName)")
                    fflush(stdout)
                    modifierState = newFlags

                    if modName == "Fn" {
                        fnDown = false
                        var cleaned = event.flags
                        cleaned.remove(.maskSecondaryFn)
                        event.flags = cleaned
                        return Unmanaged.passRetained(event)
                    }
                    return Unmanaged.passRetained(event)
                }
                break
            }
        }

        modifierState = newFlags
        return Unmanaged.passRetained(event)
    }

    if type.rawValue == 14 {
        if let nsEvent = NSEvent(cgEvent: event), nsEvent.subtype.rawValue == 8 {
            let sysKeycode = (nsEvent.data1 & 0xFFFF0000) >> 16
            print("raw:system:keycode=0x\\(String(sysKeycode, radix: 16)):data1=\\(nsEvent.data1)")
            fflush(stdout)
            if sysKeycode == 0x3F {
                let data1 = nsEvent.data1
                let neutralized = data1 & ~0x100
                event.setIntegerValueField(.mouseEventNumber, value: Int64(neutralized))
                return Unmanaged.passRetained(event)
            }
        }
    }

    return Unmanaged.passRetained(event)
}

let eventMask: CGEventMask =
    (1 << CGEventType.keyDown.rawValue) |
    (1 << CGEventType.keyUp.rawValue) |
    (1 << CGEventType.flagsChanged.rawValue) |
    (1 << 14)

guard let eventTap = CGEvent.tapCreate(
    tap: .cghidEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: eventMask,
    callback: myCGEventCallback,
    userInfo: nil
) else {
    print("error:tap_failed")
    fflush(stdout)
    exit(1)
}

tapPort = eventTap

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: eventTap, enable: true)

print("started")
fflush(stdout)

CFRunLoopRun()
`;

let fnMonitorProcess: ChildProcessWithoutNullStreams | null = null;
let fnMonitorStdoutBuffer = '';
let fnMonitorStarting: Promise<void> | null = null;
let awaitingVoiceConfirm = false;

function emitRecordingCommand(action: VoiceRecordingAction): void {
  const petWindow = getPetWindow();
  if (!petWindow || petWindow.isDestroyed()) {
    logger.warn(`[voice-shortcut] Unable to emit "${action}" because the pet window is unavailable`);
    return;
  }
  petWindow.webContents.send('pet:recording-command', { action });
}

function dispatchVoiceShortcutAction(): void {
  const state = getPetRuntimeState();

  if (state.activity === 'recording') {
    logger.info(`[voice-shortcut] ${VOICE_FALLBACK_SHORTCUT} pressed while recording; confirming voice input`);
    emitRecordingCommand('confirm');
    return;
  }

  if (state.activity === 'transcribing') {
    logger.info(`[voice-shortcut] ${VOICE_FALLBACK_SHORTCUT} pressed while transcribing; ignoring`);
    return;
  }

  logger.info(`[voice-shortcut] ${VOICE_FALLBACK_SHORTCUT} pressed while ${state.activity}; starting voice input`);
  emitRecordingCommand('start');
}

function handleFnMonitorLine(line: string): void {

  if (line === 'started') {
    logger.info('[voice-shortcut] Fn monitor started');
    return;
  }

  if (line === 'error:tap_failed') {
    logger.warn('[voice-shortcut] Fn monitor failed to create event tap. Accessibility/Input Monitoring permission may be missing.');
    return;
  }

  if (line === 'key:down:Fn') {
    const state = getPetRuntimeState();
    if (state.activity === 'recording' || state.activity === 'transcribing') {
      logger.info(`[voice-shortcut] Ignoring Fn down because pet runtime is already ${state.activity}`);
      return;
    }

    awaitingVoiceConfirm = true;
    emitRecordingCommand('start');
    return;
  }

  if (line === 'key:up:Fn') {
    if (!awaitingVoiceConfirm) {
      logger.info('[voice-shortcut] Ignoring Fn up because no voice confirmation is pending');
      return;
    }

    awaitingVoiceConfirm = false;
    emitRecordingCommand('confirm');
  }
}

function consumeStdoutChunk(chunk: string): void {
  fnMonitorStdoutBuffer += chunk;
  const lines = fnMonitorStdoutBuffer.split(/\r?\n/);
  fnMonitorStdoutBuffer = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line) {
      handleFnMonitorLine(line);
    }
  }
}

async function ensureFnMonitorFiles(): Promise<{ sourcePath: string; binaryPath: string }> {
  const baseDir = join(app.getPath('userData'), 'native-shortcuts');
  const sourcePath = join(baseDir, 'fn-monitor.swift');
  const binaryPath = join(baseDir, 'fn-monitor');

  await mkdir(baseDir, { recursive: true });

  let existingSource = '';
  try {
    existingSource = await readFile(sourcePath, 'utf8');
  } catch {
    existingSource = '';
  }

  if (existingSource !== FN_MONITOR_SOURCE) {
    await writeFile(sourcePath, FN_MONITOR_SOURCE, 'utf8');
  }

  return { sourcePath, binaryPath };
}

async function compileFnMonitor(sourcePath: string, binaryPath: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const compile = spawn('/usr/bin/swiftc', [sourcePath, '-O', '-o', binaryPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    let stdout = '';

    compile.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    compile.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    compile.on('error', (error) => {
      rejectPromise(error);
    });
    compile.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error((stderr || stdout || `swiftc exited with code ${code}`).trim()));
    });
  });
}

async function startFnMonitorInternal(): Promise<void> {
  if (process.platform !== 'darwin' || fnMonitorProcess) {
    return;
  }

  const { sourcePath, binaryPath } = await ensureFnMonitorFiles();
  await compileFnMonitor(sourcePath, binaryPath);

  fnMonitorStdoutBuffer = '';
  fnMonitorProcess = spawn(binaryPath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  fnMonitorProcess.stdout.on('data', (chunk) => {
    consumeStdoutChunk(chunk.toString());
  });

  fnMonitorProcess.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      logger.warn('[voice-shortcut] Fn monitor stderr:', message);
    }
  });

  fnMonitorProcess.on('error', (error) => {
    logger.error('[voice-shortcut] Fn monitor process error:', error);
  });

  fnMonitorProcess.on('close', (code, signal) => {
    if (fnMonitorProcess) {
      logger.info(`[voice-shortcut] Fn monitor exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    }
    fnMonitorProcess = null;
    awaitingVoiceConfirm = false;
  });
}

export async function startVoiceShortcutMonitor(): Promise<void> {
  const shortcutRegistered = globalShortcut.isRegistered(VOICE_FALLBACK_SHORTCUT)
    || globalShortcut.register(VOICE_FALLBACK_SHORTCUT, () => {
      dispatchVoiceShortcutAction();
    });
  if (!shortcutRegistered) {
    logger.warn(`[voice-shortcut] Failed to register fallback shortcut ${VOICE_FALLBACK_SHORTCUT}`);
  } else {
    logger.info(`[voice-shortcut] Registered fallback shortcut ${VOICE_FALLBACK_SHORTCUT}`);
  }

  if (process.platform !== 'darwin') {
    return;
  }

  if (fnMonitorProcess) {
    return;
  }

  if (fnMonitorStarting) {
    await fnMonitorStarting;
    return;
  }

  fnMonitorStarting = startFnMonitorInternal()
    .catch((error) => {
      logger.warn('[voice-shortcut] Failed to start Fn monitor:', error);
    })
    .finally(() => {
      fnMonitorStarting = null;
    });

  await fnMonitorStarting;
}

export function stopVoiceShortcutMonitor(): void {
  if (globalShortcut.isRegistered(VOICE_FALLBACK_SHORTCUT)) {
    globalShortcut.unregister(VOICE_FALLBACK_SHORTCUT);
  }
  awaitingVoiceConfirm = false;
  fnMonitorStdoutBuffer = '';

  if (fnMonitorProcess && !fnMonitorProcess.killed) {
    fnMonitorProcess.kill();
  }
  fnMonitorProcess = null;
}
