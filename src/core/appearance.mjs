/** Personal display preferences only; canonical content and exported artwork stay unchanged. */
export const SHEET_THEME_LABELS=Object.freeze({black:'Midnight Black',slate:'Dark Slate',paper:'Clean Paper',warm:'Warm Paper',source:'Original artwork'});
export const APPEARANCE_PRESETS=Object.freeze([
 {id:'midnight',label:'Midnight',description:'Black interface · black sheets',theme:'black',sheetTheme:'black'},
 {id:'slate',label:'Night Slate',description:'Slate interface · slate sheets',theme:'slate',sheetTheme:'slate'},
 {id:'blue',label:'Clear Blue',description:'Blue interface · white sheets',theme:'fluent',sheetTheme:'paper'},
 {id:'sage',label:'Sage',description:'Sage interface · white sheets',theme:'neutral',sheetTheme:'paper'},
 {id:'lavender',label:'Lavender',description:'Lavender interface · white sheets',theme:'lavender',sheetTheme:'paper'},
 {id:'academic',label:'Warm Study',description:'Academic interface · warm sheets',theme:'academic',sheetTheme:'warm'}
]);
/** Missing preferences in old backups retain their existing appearance. */
export function sheetThemeFor(session){return session.sheetTheme??(['black','slate'].includes(session.theme)?session.theme:'source');}
export function appearancePresetFor(session){return APPEARANCE_PRESETS.find(p=>p.theme===session.theme&&p.sheetTheme===sheetThemeFor(session))?.id??'custom';}
export const SHEET_PALETTES=Object.freeze({
 black:Object.freeze({paper:'#141517',ink:'#e1e4e9',primary:'#a9cfff',secondary:'#a4d5bb',line:'#292e36',code:'#1c2027',warning:'#ffb3be',warningFill:'#332128',example:'#d8dde7',caption:'#a5afbe',border:'#39414e',box:'#1c2925',boxBorder:'#3c5549',tableHead:'#24332e',stripe:'#1a201e',tableLine:'#3c4b43',margin:'#353d49'}),
 slate:Object.freeze({paper:'#1e2938',ink:'#edf1f7',primary:'#99c5ff',secondary:'#a9d9b5',line:'#344456',code:'#172332',warning:'#ffb3be',warningFill:'#402b36',example:'#e1eaf6',caption:'#bdc9d9',border:'#455467',box:'#263b38',boxBorder:'#536b64',tableHead:'#304158',stripe:'#233143',tableLine:'#455467',margin:'#455467'}),
 paper:Object.freeze({paper:'#fbfcfd',ink:'#293746',primary:'#183f68',secondary:'#47745e',line:'#e2eaf0',code:'#eef2f6',warning:'#983c4c',warningFill:'#fbf0f1'}),
 warm:Object.freeze({paper:'#f8f3e8',ink:'#3d3932',primary:'#564b36',secondary:'#536c4e',line:'#e8dfce',code:'#eee7d9',warning:'#963e45',warningFill:'#f5e3df',example:'#403b31',caption:'#706654',border:'#d7cbb7',box:'#edf0e4',boxBorder:'#c9d1bb',tableHead:'#e4e8d8',stripe:'#f0f1e7',tableLine:'#c9d1bb',margin:'#dbceb9'})
});
