# WebMCP Agent Lab demo video

This Remotion composition renders the 1:42 narrated hackathon overview published at <https://vgpu-webmcp.vercel.app/webmcp-agent-lab-demo.mp4>.

The screenshots were captured from the deployed site after running its real WebMCP tools. Scene source lives in `src/scenes`, narration text and audio live in `public`, and the deployed MP4 is generated at `../apps/docs/public/webmcp-agent-lab-demo.mp4`.

```bash
npm install
npm run dev
npx remotion render WebMCPAgentLab ../apps/docs/public/webmcp-agent-lab-demo.mp4
```
