// Convex HTTP routes. Currently registers Convex Auth's routes only —
// other features can extend this router as they need HTTP endpoints.

import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
