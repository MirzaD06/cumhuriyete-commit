// Python kodunu sayfadan ayrı çalıştırır; sonsuz döngüde sayfa donmaz, işçi sonlandırılıp yeniden başlatılır.
let pyodideReady = null;

const SETUP = `
import builtins

def _input_yok(*args, **kwargs):
    raise RuntimeError("Bu alıştırmada input() kullanılmıyor. Değeri doğrudan yaz: ad = 'Ayşe'")

builtins.input = _input_yok
`;

async function load(indexURL) {
  importScripts(indexURL + 'pyodide.js');
  const pyodide = await loadPyodide({ indexURL });
  pyodide.setStdout({ batched: (text) => postMessage({ type: 'out', text }) });
  pyodide.setStderr({ batched: (text) => postMessage({ type: 'err', text }) });
  pyodide.runPython(SETUP);
  return pyodide;
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      pyodideReady = load(data.indexURL);
      await pyodideReady;
      postMessage({ type: 'ready' });
    } catch (e) {
      postMessage({ type: 'load-failed', text: String(e) });
    }
    return;
  }

  if (data.type === 'run') {
    const pyodide = await pyodideReady;
    try {
      pyodide.globals.clear();
      await pyodide.runPythonAsync(data.code);
      postMessage({ type: 'done', ok: true });
    } catch (e) {
      const text = String(e.message || e);
      const lines = text.trim().split('\n');
      postMessage({ type: 'done', ok: false, error: lines[lines.length - 1], detail: text });
    }
  }
};
