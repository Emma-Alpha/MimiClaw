---
name: gmail
description: "Gmail: read, search, compose, and send emails via Gmail API. List inbox messages, search by query, read email content, reply to threads, and send new emails. Use when: the user wants to check their Gmail inbox, read an email, search for emails, send a new email, reply to a message, manage email labels, or get a summary of unread messages."
metadata: { "openclaw": { "emoji": "📨" } }
---

## Setup
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Desktop App type)
3. Enable Gmail API at https://console.cloud.google.com/apis/library/gmail.googleapis.com
4. Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in PetClaw settings

## Authentication
```bash
# First-time auth (opens browser for Google OAuth)
python3 -c "
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_config({
    'installed': {
        'client_id': '$GMAIL_CLIENT_ID',
        'client_secret': '$GMAIL_CLIENT_SECRET',
        'redirect_uris': ['urn:ietf:wg:oauth:2.0:oob'],
        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
        'token_uri': 'https://oauth2.googleapis.com/token'
    }
}, ['https://www.googleapis.com/auth/gmail.modify'])
creds = flow.run_local_server(port=0)
# Save creds to ~/.petclaw/gmail-token.json
"
```

## Core Operations

### List Inbox
```python
from googleapiclient.discovery import build

service = build('gmail', 'v1', credentials=creds)
results = service.users().messages().list(userId='me', maxResults=10, q='in:inbox is:unread').execute()
messages = results.get('messages', [])
```

### Read Email
```python
msg = service.users().messages().get(userId='me', id=message_id, format='full').execute()
subject = next(h['value'] for h in msg['payload']['headers'] if h['name'] == 'Subject')
```

### Send Email
```python
import base64
from email.mime.text import MIMEText

message = MIMEText(body)
message['to'] = to_email
message['subject'] = subject
raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
service.users().messages().send(userId='me', body={'raw': raw}).execute()
```

## Workflow
1. Check authentication status (load token from `~/.petclaw/gmail-token.json`)
2. For inbox check: list recent unread emails with sender, subject, date
3. For reading: fetch full email content and parse headers/body
4. For sending: draft message, show preview, confirm with user before sending
5. Always confirm before any destructive action (delete, mark read, etc.)

## Privacy
- OAuth tokens stored locally at `~/.petclaw/gmail-token.json`
- Only requested scopes: read + send (`gmail.modify`)
- Never stores email content persistently
