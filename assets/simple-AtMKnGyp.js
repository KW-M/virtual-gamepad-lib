import{G as m}from"./GamepadEmulator-CNWoeGf3.js";import{s as E}from"./helpers-DCx76efX.js";import{L as p,R as _}from"./display-gamepad-right-BmtaGMJm.js";import"./GamepadDisplay-3X_eRe0j.js";const g=new m(.1);window.addEventListener("DOMContentLoaded",()=>{const u=document.getElementById("gpad_display_container"),s=document.getElementById("axis-table"),c=document.getElementById("button-table");document.getElementById("gpad_display_left").innerHTML=p,document.getElementById("gpad_display_right").innerHTML=_;const d=0,{gpadApiWrapper:i}=E(u,{AllowDpadDiagonals:!0,GpadEmulator:g,EmulatedGamepadIndex:d,EmulatedGamepadOverlayMode:!0});i.onGamepadButtonChange((l,e,o)=>{if(console.log(`Gamepad ${l} button change: `,o),l===d)for(let t=0;t<e.buttons.length;t++){if(!o[t])continue;const r=e.buttons[t].value,n=c.children[t];if(!n)continue;const a=n.children[2];n.style.backgroundColor=e.buttons[t].pressed?"blueviolet":e.buttons[t].touched?"greenyellow":"",a.style.backgroundColor=r==0?"":"#00FF"+Math.round(r*255).toString(16).padStart(2,"0"),a.innerText=r.toFixed(2)}}),i.onGamepadAxisChange((l,e,o)=>{if(console.log(`Gamepad ${l} axis change: `,e.axes,o),l===d)for(let t=0;t<o.length;t++){if(!o[t])continue;const n=s.children[1].children[t+1];if(!n)continue;const a=e.axes[t];n.style.backgroundColor="#"+Math.round(255-Math.max(-a,0)*255).toString(16).padStart(2,"0")+"FF"+Math.round(255-Math.max(a,0)*255).toString(16).padStart(2,"0"),n.innerText=a.toFixed(2)}})});