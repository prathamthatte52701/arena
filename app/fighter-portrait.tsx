'use client';
import {useEffect,useRef} from 'react';
import {atlasSource,ATLAS_URL} from './fighter-art';
import {roster} from './engine';
export default function FighterPortrait({id}:{id:number}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{let active=true;const img=new Image();img.onload=()=>{const c=ref.current?.getContext('2d');if(!active||!c)return;const [sx,sy,sw,sh]=atlasSource(img,id,0);c.clearRect(0,0,440,470);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';const width=600,height=width*sh/sw;c.drawImage(img,sx,sy,sw,sh,(440-width)/2,-12,width,height);};img.src=ATLAS_URL;return()=>{active=false;img.onload=null;};},[id]);return <canvas ref={ref} width={440} height={470} className="portrait photoPortrait" role="img" aria-label={`${roster[id].name}, reference-based AI wrestler`}/>;}
