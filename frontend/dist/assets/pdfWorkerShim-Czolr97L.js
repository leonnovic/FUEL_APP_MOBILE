const r=`
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function() {
    var resolve, reject;
    var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}
`;function c(e){const o=e.endsWith(".mjs"),t=o?`${r}
import(${JSON.stringify(e)}).catch(function(e){ self.console && console.error('worker load failed', e); });`:`${r}
try { importScripts(${JSON.stringify(e)}); } catch (e) { self.console && console.error('worker load failed', e); }`,s=new Blob([t],{type:o?"text/javascript":"application/javascript"});return URL.createObjectURL(s)}export{c as makePatchedWorkerSrc};
