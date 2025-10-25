import { fileURLToPath, URL } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import child_process from "child_process";
import { env } from "process";

export default defineConfig(({ command }) => {
    // Aliases + test config apply in both dev and build
    const common = {
        plugins: [react()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
                "@calendar": fileURLToPath(new URL("./src/components/calendar", import.meta.url)),
                "@auth": fileURLToPath(new URL("./src/components/auth", import.meta.url)),
                "@layout": fileURLToPath(new URL("./src/components/layout", import.meta.url)),
                "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
            },
        },
        test: {
            globals: true,
            environment: "jsdom",
            setupFiles: "./src/__tests__/setupTests.ts",
            exclude: [...configDefaults.exclude],
            ui: true,
            deps: {
                inline: [/^@auth/, /^@components/, /^@styles/, /^@/],
            },
        },
    };

    if (command !== "serve") {
        // Build/preview: no dev certs or proxy
        return common;
    }

    // -------- DEV ONLY: HTTPS cert + proxy -------------
    const baseFolder =
        env.APPDATA && env.APPDATA !== ""
            ? `${env.APPDATA}/ASP.NET/https`
            : `${env.HOME}/.aspnet/https`;

    const certificateName = "betterschedule.client";
    const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
    const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true });
    }

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        const result = child_process.spawnSync(
            "dotnet",
            ["dev-certs", "https", "--export-path", certFilePath, "--format", "Pem", "--no-password"],
            { stdio: "inherit" }
        );
        if (result.status !== 0) {
            throw new Error("Could not create HTTPS development certificate.");
        }
    }

    const VITE_PORT = Number(env.DEV_SERVER_PORT ?? 57890);
    const BACKEND_HTTPS_PORT = Number(env.ASPNETCORE_HTTPS_PORT ?? 7248);

    return {
        ...common,
        server: {
            port: VITE_PORT,
            strictPort: true,
            https: {
                key: fs.readFileSync(keyFilePath),
                cert: fs.readFileSync(certFilePath),
            },
            proxy: {
                "^/api": {
                    target: `https://localhost:${BACKEND_HTTPS_PORT}`,
                    secure: false,
                    changeOrigin: true,
                },
            },
        },
    };
});
