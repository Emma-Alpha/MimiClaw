/**
 * AnimatedCharacters — 登录页鼠标跟踪卡通角色。
 * 结构性 CSS 用 antd-style createStyles，动态位置/变换保留 inline style。
 */
import { useState, useEffect, useRef } from 'react';
import { createStyles } from 'antd-style';

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles(() => ({
  root: {
    position: 'relative' as const,
  },
  character: {
    position: 'absolute' as const,
    borderRadius: 24,
    border: '4px solid black',
    transformOrigin: 'bottom center',
    transition: 'all 500ms ease-out',
    bottom: 0,
  },
  eyeRow: {
    position: 'absolute' as const,
    display: 'flex',
    transition: 'all 500ms ease-out',
  },
  eyeball: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '9999px',
    border: '2px solid black',
    transition: 'transform 150ms ease-out',
  },
  pupil: {
    borderRadius: '9999px',
    transition: 'transform 100ms ease-out',
  },
  mouth: {
    position: 'absolute' as const,
    borderRadius: '9999px',
    background: '#000',
    transition: 'all 500ms ease-out',
  },
}));

// ─── Pupil ────────────────────────────────────────────────────────────────────

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

export const Pupil = ({ size = 12, maxDistance = 5, pupilColor = 'black', forceLookX, forceLookY }: PupilProps) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const { styles } = useStyles();

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div
      ref={ref}
      className={styles.pupil}
      style={{ width: size, height: size, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)` }}
    />
  );
};

// ─── EyeBall ─────────────────────────────────────────────────────────────────

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

export const EyeBall = ({
  size = 48, pupilSize = 16, maxDistance = 10,
  eyeColor = 'white', pupilColor = 'black',
  isBlinking = false, forceLookX, forceLookY,
}: EyeBallProps) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const { styles } = useStyles();

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div
      ref={ref}
      className={styles.eyeball}
      style={{ width: size, height: size, backgroundColor: eyeColor, transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)' }}
    >
      {!isBlinking && (
        <div
          className={styles.pupil}
          style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)` }}
        />
      )}
    </div>
  );
};

// ─── AnimatedCharacters ───────────────────────────────────────────────────────

interface AnimatedCharactersProps {
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
}

export function AnimatedCharacters({ isTyping = false, showPassword = false, passwordLength = 0 }: AnimatedCharactersProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [purpleBlinking, setPurpleBlinking] = useState(false);
  const [blackBlinking, setBlackBlinking] = useState(false);
  const [lookingAtEachOther, setLookingAtEachOther] = useState(false);
  const [purplePeeking, setPurplePeeking] = useState(false);
  const { styles } = useStyles();

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  // Mouse tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Random blink schedulers
  useEffect(() => {
    const schedule = (setter: (v: boolean) => void) => {
      const t = setTimeout(() => {
        setter(true);
        setTimeout(() => { setter(false); schedule(setter); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = schedule(setPurpleBlinking);
    const t2 = schedule(setBlackBlinking);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Typing look-at-each-other
  useEffect(() => {
    if (isTyping) {
      setLookingAtEachOther(true);
      const t = setTimeout(() => setLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
    setLookingAtEachOther(false);
  }, [isTyping]);

  // Password peek
  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const t = setTimeout(() => {
        setPurplePeeking(true);
        setTimeout(() => setPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    }
    setPurplePeeking(false);
  }, [passwordLength, showPassword]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 3);
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const S = 1.75;
  const pp = calcPos(purpleRef);
  const bp = calcPos(blackRef);
  const yp = calcPos(yellowRef);
  const op = calcPos(orangeRef);
  const hiding = passwordLength > 0 && !showPassword;
  const revealing = passwordLength > 0 && showPassword;

  return (
    <div className={styles.root} style={{ width: Math.round(400 * S), height: Math.round(300 * S) }}>

      {/* Purple — back layer */}
      <div
        ref={purpleRef}
        className={styles.character}
        style={{
          zIndex: 10, background: '#B19CD9',
          width: Math.round(112 * S), height: Math.round(192 * S),
          left: '50%', marginLeft: Math.round(-8 * S),
          transform: revealing
            ? 'skewX(0deg)'
            : (isTyping || hiding)
              ? `skewX(${pp.bodySkew - 12}deg) translateX(${Math.round(40 * S)}px)`
              : `skewX(${pp.bodySkew}deg)`,
        }}
      >
        <div
          className={styles.eyeRow}
          style={{
            gap: 12,
            left: revealing ? Math.round(20 * S) : lookingAtEachOther ? Math.round(55 * S) : Math.round(45 * S) + pp.faceX,
            top: revealing ? Math.round(35 * S) : lookingAtEachOther ? Math.round(65 * S) : Math.round(40 * S) + pp.faceY,
          }}
        >
          {[0, 1].map(i => (
            <EyeBall key={i}
              size={Math.round(24 * S)} pupilSize={Math.round(8 * S)} maxDistance={Math.round(5 * S)}
              isBlinking={purpleBlinking}
              forceLookX={revealing ? (purplePeeking ? 4 : -4) : lookingAtEachOther ? 3 : undefined}
              forceLookY={revealing ? (purplePeeking ? 5 : -4) : lookingAtEachOther ? 4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Black — middle layer */}
      <div
        ref={blackRef}
        className={styles.character}
        style={{
          zIndex: 20, background: '#000',
          width: Math.round(96 * S), height: Math.round(160 * S),
          left: '50%', marginLeft: Math.round(-92 * S),
          transform: revealing
            ? 'skewX(0deg)'
            : lookingAtEachOther
              ? `skewX(${bp.bodySkew * 1.5 + 10}deg) translateX(${Math.round(20 * S)}px)`
              : (isTyping || hiding)
                ? `skewX(${bp.bodySkew * 1.5}deg)`
                : `skewX(${bp.bodySkew}deg)`,
        }}
      >
        <div
          className={styles.eyeRow}
          style={{
            gap: 4,
            left: revealing ? Math.round(10 * S) : lookingAtEachOther ? Math.round(32 * S) : Math.round(26 * S) + bp.faceX,
            top: revealing ? Math.round(28 * S) : lookingAtEachOther ? Math.round(12 * S) : Math.round(32 * S) + bp.faceY,
          }}
        >
          {[0, 1].map(i => (
            <EyeBall key={i}
              size={Math.round(20 * S)} pupilSize={Math.round(6 * S)} maxDistance={Math.round(4 * S)}
              isBlinking={blackBlinking}
              forceLookX={revealing ? -4 : lookingAtEachOther ? 0 : undefined}
              forceLookY={revealing ? -4 : lookingAtEachOther ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Orange semi-circle — front left */}
      <div
        ref={orangeRef}
        style={{
          position: 'absolute', zIndex: 30,
          borderRadius: '9999px 9999px 0 0', border: '4px solid black',
          background: '#FFB347', transition: 'all 500ms ease-out',
          width: Math.round(128 * S), height: Math.round(96 * S),
          left: '50%', marginLeft: Math.round(-142 * S), bottom: 0,
          transform: revealing ? 'skewX(0deg)' : `skewX(${op.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className={styles.eyeRow}
          style={{
            gap: Math.round(32 * S),
            left: revealing ? Math.round(50 * S) : Math.round(82 * S) + op.faceX,
            top: revealing ? Math.round(85 * S) : Math.round(90 * S) + op.faceY,
          }}
        >
          {[0, 1].map(i => (
            <Pupil key={i}
              size={Math.round(10 * S)} maxDistance={Math.round(3 * S)}
              forceLookX={revealing ? -5 : undefined}
              forceLookY={revealing ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Yellow — front right */}
      <div
        ref={yellowRef}
        className={styles.character}
        style={{
          zIndex: 30, background: '#FFDF00',
          width: Math.round(96 * S), height: Math.round(128 * S),
          left: '50%', marginLeft: Math.round(24 * S),
          transform: revealing ? 'skewX(0deg)' : `skewX(${yp.bodySkew}deg)`,
        }}
      >
        <div
          className={styles.eyeRow}
          style={{
            gap: Math.round(12 * S),
            left: revealing ? Math.round(20 * S) : Math.round(52 * S) + yp.faceX,
            top: revealing ? Math.round(35 * S) : Math.round(40 * S) + yp.faceY,
          }}
        >
          {[0, 1].map(i => (
            <Pupil key={i}
              size={Math.round(12 * S)} maxDistance={Math.round(4 * S)}
              forceLookX={revealing ? -5 : undefined}
              forceLookY={revealing ? -4 : undefined}
            />
          ))}
        </div>
        {/* Mouth */}
        <div
          className={styles.mouth}
          style={{
            height: Math.round(4 * S),
            width: revealing ? Math.round(26 * S) : hiding ? Math.round(20 * S) : Math.round(32 * S),
            left: revealing ? Math.round(10 * S) : Math.round(40 * S) + yp.faceX,
            top: revealing ? Math.round(88 * S) : Math.round(88 * S) + yp.faceY,
          }}
        />
      </div>

    </div>
  );
}
