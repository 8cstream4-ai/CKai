import React, { memo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import type { Colors } from '../../theme';
import type { IconName } from '../../ui';
import { GlassCard, HomeTitle, LivingOrb } from './effects';
export interface HomePrompt { title:string;detail:string;icon:IconName;prompt:string; }
export function homeColors(base:Colors, light:boolean, amoled:boolean):Colors {
  return light ? {...base,bg:'#FAF8F4',surface:'#FFFFFF',raised:'#ECE8F3',ink:'#24202F',muted:'#655E72',accent:'#7650AF',line:'#37294518'} : {...base,bg:amoled?'#000000':'#0B0A12',surface:'#191722',raised:'#272330',ink:'#F2EFF8',muted:'#B3ADBF',accent:'#C8B2F4',line:'#FFFFFF16'};
}
export const HomeScene=memo(function HomeScene({name,greeting,typing,prompts,colors,disabled,haptics,light,blurTarget,onPrompt}: {name:string;greeting:string;typing:number;prompts:HomePrompt[];colors:Colors;disabled:boolean;haptics:boolean;light:boolean;blurTarget:React.RefObject<React.ComponentRef<typeof View>|null>;onPrompt(prompt:string):void}) {
  const {width,height}=useWindowDimensions();const wide=width>=650;const compact=!wide&&height<850;
  const [fontsReady]=useFonts({CKaiHomeSans:Inter_400Regular,CKaiHomeMedium:Inter_500Medium,CKaiHomeSerif:Newsreader_400Regular});
  return <View style={{width:'100%',maxWidth:wide?760:480,alignSelf:'center',paddingTop:compact?8:12,paddingBottom:compact?12:16,flexDirection:wide?'row':'column',alignItems:'center',gap:wide?28:0}}>
    <View style={{alignItems:'center',width:wide?'44%':'100%'}}>
      <LivingOrb size={compact?80:wide||width<380?128:144} typing={typing} disabled={disabled} />
      <View style={{marginTop:4}}><HomeTitle name={name} greeting={greeting} colors={colors} disabled={disabled} fontsReady={fontsReady} compact={compact} /></View>
      <Text style={{fontFamily:fontsReady?'CKaiHomeSans':undefined,color:colors.muted,fontSize:13,lineHeight:22,textAlign:'center',marginTop:compact?4:8,marginBottom:compact?12:20,maxWidth:300}}>{compact ? 'Une idée ? On lui donne vie.' : <>Une question, une intuition, un projet.{ '\n' }On lui donne une nouvelle dimension.</>}</Text>
    </View>
    <View style={{width:wide?'52%':'100%',flexDirection:'row',flexWrap:'wrap',columnGap:12,rowGap:12}}>
      {prompts.map((prompt,index)=><GlassCard key={prompt.title} title={prompt.title} detail={prompt.detail} icon={prompt.icon} colors={colors} index={index} onPrompt={onPrompt} prompt={prompt.prompt} disabledMotion={disabled} haptics={haptics} blurTarget={blurTarget} light={light} compact={compact} />)}
    </View>
  </View>;
});
