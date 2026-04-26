import { useState, useEffect, useRef, useCallback } from 'react';

interface PyodideInstance {
    runPythonAsync: (code: string) => Promise<any>;
    setStdout: (config: { batched: (text: string) => void }) => void;
    setStderr: (config: { batched: (text: string) => void }) => void;
    loadPackagesFromImports: (code: string) => Promise<void>;
}

interface UsePyodideReturn {
    pyodide: PyodideInstance | null;
    isLoading: boolean;
    loadingProgress: number;
    error: string | null;
    runCode: (code: string) => Promise<{ output: string[]; error: string | null }>;
    retry: () => void;
}

declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<PyodideInstance>;
    }
}

export function usePyodide(): UsePyodideReturn {
    const [pyodide, setPyodide] = useState<PyodideInstance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const initAttempted = useRef(false);

    const initPyodide = useCallback(async () => {
        if (pyodide) return;

        setIsLoading(true);
        setError(null);
        setLoadingProgress(0);

        try {
            // Simulate progress stages
            setLoadingProgress(10);

            const progressInterval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + Math.random() * 15;
                });
            }, 500);

            const py = await window.loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
            });

            clearInterval(progressInterval);
            setLoadingProgress(100);
            setPyodide(py);
            setIsLoading(false);
        } catch (err: any) {
            console.error("Pyodide initialization failed:", err);
            setError(err.message || "Failed to load Python environment");
            setIsLoading(false);
        }
    }, [pyodide]);

    useEffect(() => {
        if (!initAttempted.current) {
            initAttempted.current = true;
            initPyodide();
        }
    }, [initPyodide]);

    const runCode = useCallback(async (code: string): Promise<{ output: string[]; error: string | null }> => {
        if (!pyodide) {
            return { output: [], error: "Python environment not loaded" };
        }

        const outputBuffer: string[] = [];

        try {
            pyodide.setStdout({ batched: (text: string) => outputBuffer.push(text) });
            pyodide.setStderr({ batched: (text: string) => outputBuffer.push(text) });

            await pyodide.runPythonAsync(code);

            return { output: outputBuffer, error: null };
        } catch (err: any) {
            // Extract meaningful error message
            let errorMessage = err.message || "An error occurred";

            // Parse Python traceback for user-friendly message
            if (errorMessage.includes("Traceback")) {
                const lines = errorMessage.split("\n");
                const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
                if (lastLine && lastLine.trim()) {
                    errorMessage = lastLine.trim();
                }
            }

            return { output: outputBuffer, error: errorMessage };
        }
    }, [pyodide]);

    const retry = useCallback(() => {
        initAttempted.current = false;
        setPyodide(null);
        initPyodide();
    }, [initPyodide]);

    return {
        pyodide,
        isLoading,
        loadingProgress,
        error,
        runCode,
        retry
    };
}

export default usePyodide;
