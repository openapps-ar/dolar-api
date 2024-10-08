import "../font/font.css";
import { __MODS__ } from "../capacitor/apk-mods";
import { get_code_from_network } from "./network";
import { type Runtime } from "../runtime";
import { env } from "../env/env";
import { exec_code, parse_code } from "../code/exec";

const run: Runtime = {
  current_code_origin: null,
  current_app: null,
  current_hash: null,
  splash_screen_hide_called: false,
  code_storage_key: "app-v2",
  destroyers: []
}

// @ts-expect-error
window._run = run;

// @ts-ignore
addEventListener("x-app-ready", (event: CustomEvent<{ uid: string }>) => {
  console.log(`app ready called with uid`, event.detail.uid)  
})

export type Code = {
  hash: string
  js: string
  css?: string | null
}

const destroy = () => {
  for(const fn of run.destroyers) {
    fn();
  }

  run.destroyers = [];
}

const get_code_from_storage = (): Code | null => {
  const stored = localStorage.getItem(run.code_storage_key);
  if(stored == null) return null;
  try {
    if(stored == null) throw new Error("ignore");
    const entry = JSON.parse(stored ?? "");
    if(
      entry == null ||
      typeof entry !== "object" ||
      typeof entry.hash !== "string" ||
      typeof entry.js !== "string"
    ) throw new Error("entry does not conform with the expected shape");
    
    return entry;

  } catch(e) {
    console.warn("error parsing code from storage", e);
    localStorage.removeItem(run.code_storage_key);
    return null;
  }
}

const start = async () => {
  
  if(env.DEV) {
    console.log("running in dev mode");
    console.log("exec code", "apk");
    run.current_code_origin = "dev";
    // TODO: add hash to apk code
    run.current_hash = null;
    await import("./app");
    return;
  }

  try {

    const storage = get_code_from_storage();
    if(storage != null) {
      console.log("exec code", "storage");
      const fn = parse_code(storage.js);
      run.current_code_origin = "storage";
      run.current_hash = storage.hash;
      await exec_code(fn)
    } else {
      console.log("no code in storage");
      console.log("exec code", "apk");
      run.current_code_origin = "apk";
      // TODO: add hash to apk code
      run.current_hash = null;
      await import("./app");
    }
  } catch(e1) {
    console.log("exec error 1", e1);

    try {
    
      console.log("getting code from network");
      const network = await get_code_from_network();
      
      console.log("exec code", "network");
      
      const fn = parse_code(network.js);

      console.log("calling destroyers");
      destroy();

      run.current_code_origin = "network";
      run.current_hash = network.hash;
     
      exec_code(fn);

      console.log("network code executed");
      console.log("saving network code to storage");

      localStorage.setItem(run.code_storage_key, JSON.stringify(network));

    } catch (e2) {
      console.warn("exec error 2", e2);

      const { dialog: { Dialog } } = __MODS__;
      const message = [
        "Ocurrió un error al iniciar la aplicación.",
        "Intentá borrar el almacenamiento de la app y probar de nuevo.",
        "Si el problema persiste, ponete en contacto con nuestro soporte.",
        `[error 1]: ${String(e1)}`,
        `[error 2]: ${String(e2)}`,
      ].join("\n")
        
      Dialog.alert({ message }).finally(() => {
        const { app: { App } } = __MODS__;
        App.exitApp();
      })
    }
  }
}

start();