import { createApp } from "../apps/api/src/app.js";

// Every /api/* request is rewritten to this one function while Express keeps
// responsibility for matching the original API route.
export default createApp();
