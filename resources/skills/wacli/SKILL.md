---
name: wacli
description: "WhatsApp CLI (wacli): send and receive WhatsApp messages from the command line. Send text messages, media files, and documents to WhatsApp contacts or groups. Use when: the user wants to send a WhatsApp message, share a file via WhatsApp, message a contact on WhatsApp, or automate WhatsApp notifications."
metadata: { "openclaw": { "emoji": "💬", "requires": { "bins": ["wacli"] }, "install": [{ "id": "brew-wacli", "label": "Install wacli (Homebrew)", "command": "brew install steipete/tap/wacli", "bins": ["wacli"] }] } }
---

## Setup
```bash
brew install steipete/tap/wacli
wacli login  # Scan QR code with WhatsApp on your phone
```

## Core Commands

### Send Text Message
```bash
# Send to a contact (by phone number with country code)
wacli send --to "+1234567890" --message "Hello from Claude!"

# Send to a saved contact name
wacli send --to "John Doe" --message "Your report is ready"
```

### Send File/Media
```bash
# Send image
wacli send --to "+1234567890" --file /path/to/image.jpg

# Send document
wacli send --to "+1234567890" --file /path/to/report.pdf --caption "Monthly report"
```

### List Contacts
```bash
wacli contacts list
```

### Check Status
```bash
wacli status  # Check if logged in and connected
```

## Workflow
1. Confirm `wacli status` shows connected (if not, prompt user to run `wacli login`)
2. Identify recipient: ask user for contact name or phone number
3. Compose message content
4. Show preview to user before sending
5. Execute send command
6. Confirm delivery

## Privacy Note
- All messages are end-to-end encrypted via WhatsApp
- wacli uses WhatsApp Web protocol (same as WhatsApp Desktop)
- Login session persists until user runs `wacli logout`
