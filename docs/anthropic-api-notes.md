# Anthropic API Key Issue

There's an authentication issue with the current Anthropic API key. Based on the error message: 

```
Claude API Error (401: Unauthorized): {"type":"error","error":{"type":"authentication_error","message":"Invalid bearer token"}}
```

## Solution Steps

1. **Generate a new API key**:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Go to "API Keys" section
   - Create a new API key
   - The key should start with `sk-ant-` (which is the newer format)

2. **Update your .env.local file**:
   - Replace the current value of `ANTHROPIC_API_KEY` with your new key
   - Ensure there are no extra spaces or characters
   - Format should be: `ANTHROPIC_API_KEY=sk-ant-YOUR-NEW-KEY-HERE`

3. **Restart your development server**:
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` to restart

## Additional Notes

- Make sure your account has an active subscription or credits
- Verify the API key has the necessary permissions
- The latest fix in the codebase handles authentication format correctly
- If issues persist, check [Anthropic's status page](https://status.anthropic.com/) 