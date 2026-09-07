export const ATLAS_URL='/fighters/realistic-atlas.png';
// Keep the published transparent sprites until the new reference artwork has a valid alpha channel.
const rowRanges=[[0,350],[350,320],[670,315],[985,265]];
const columns=[[0,314],[328,308],[646,313],[966,288]];
export function atlasSource(img:Pick<HTMLImageElement,'naturalWidth'|'naturalHeight'>,id:number,row:number):[number,number,number,number]{const [x,w]=columns[id],[y,h]=rowRanges[row];return [x*img.naturalWidth/1254,y*img.naturalHeight/1254,w*img.naturalWidth/1254,h*img.naturalHeight/1254];}
