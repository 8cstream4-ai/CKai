import React, { memo, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeInDown, interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { Canvas, Circle, Fill, Group, Path, Shader, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useLowPowerMode } from 'expo-battery';
import { LinearGradient } from 'expo-linear-gradient';
import NativeMaskedView from '@react-native-masked-view/masked-view';
// The native module's legacy declaration predates React 19; preserve its documented props.
const MaskedView=NativeMaskedView as unknown as React.ComponentType<import('react-native').ViewProps & {maskElement:React.ReactElement}>;
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { tokens, type Colors } from '../../theme';
import { Icon, type IconName } from '../../ui';
import { ORB_SHADER, BACKGROUND_SHADER } from './shaders';

const orbShader = Skia.RuntimeEffect.Make(ORB_SHADER);
const backgroundShader = Skia.RuntimeEffect.Make(BACKGROUND_SHADER);
const spring = { damping: 18, stiffness: 180 };
export function useHomeMotion(disabled = false) {
  const systemReduced = useReducedMotion(); const lowPower = useLowPowerMode(); const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => { const subscription = AppState.addEventListener('change',state => setForeground(state === 'active')); return () => subscription.remove(); }, []);
  return { animated: !disabled && !systemReduced && !lowPower && foreground, lowPower, reduced: disabled || systemReduced };
}

/** Uniform updates happen on the UI thread; no React or JS timer runs per frame. */
export const LivingOrb = memo(function LivingOrb({ size = 148, typing = 0, disabled = false, miniature = false }: { size?: number; typing?: number; disabled?: boolean; miniature?: boolean }) {
  const { animated } = useHomeMotion(disabled); const clock = useSharedValue(0); const breath = useSharedValue(1); const pulse = useSharedValue(0);
  useEffect(() => { if (animated && !miniature) breath.value = withRepeat(withSequence(withTiming(1.04,{duration:2000,easing:Easing.inOut(Easing.sin)}),withTiming(1,{duration:2000,easing:Easing.inOut(Easing.sin)})),-1); else { cancelAnimation(breath); breath.value=1; } return () => cancelAnimation(breath); }, [animated,miniature,breath]);
  useEffect(() => { if (typing && animated) pulse.value=withSequence(withTiming(1,{duration:90}),withTiming(0,{duration:340})); }, [typing,animated,pulse]);
  const frame=useFrameCallback(info => { clock.value=(info.timestamp ?? 0)/1000; });
  useEffect(() => { frame.setActive(animated && !miniature); return () => frame.setActive(false); }, [animated,miniature,frame]);
  const uniforms=useDerivedValue(()=>({resolution:[size,size],time:clock.value,energy:pulse.value}));
  const viewStyle=useAnimatedStyle(()=>({transform:[{scale:breath.value + pulse.value*0.022}]}));
  const ring=useMemo(()=>{const r=size*.365,c=size/2,a=40*Math.PI/180,b=320*Math.PI/180;return Skia.Path.MakeFromSVGString(`M ${c+r*Math.cos(a)} ${c+r*Math.sin(a)} A ${r} ${r} 0 1 1 ${c+r*Math.cos(b)} ${c+r*Math.sin(b)}`) ?? Skia.Path.Make();},[size]);
  const sparkX=useDerivedValue(()=>size/2+Math.cos(-0.69+Math.sin(clock.value*.5)*.05)*size*.365);
  const sparkY=useDerivedValue(()=>size/2+Math.sin(-0.69+Math.sin(clock.value*.5)*.05)*size*.365);
  const sparkOpacity=useDerivedValue(()=>0.65+Math.sin(clock.value*1.8)*.25);
  return <Animated.View accessible accessibilityLabel="Orbe CKai, anneau en C" style={[{width:size,height:size},viewStyle]}><Canvas style={{width:size,height:size}}>
    {orbShader ? <Fill><Shader source={orbShader} uniforms={uniforms} /></Fill> : <Circle cx={size/2} cy={size/2} r={size*.32} color="#A18DE8" />}
    <Path path={ring} style="stroke" strokeWidth={miniature ? 1.4 : 1.8} strokeCap="round" opacity={.85}><SweepGradient c={vec(size/2,size/2)} colors={['#C5A5FA','#8BE9F0','#ECAED7','#C5A5FA']} /></Path>
    <Group opacity={sparkOpacity}><Circle cx={sparkX} cy={sparkY} r={miniature ? 1.2 : 2.5} color="#FFFFFF" />{!miniature ? <Circle cx={sparkX} cy={sparkY} r={6} color="#D9CBFF" opacity={.2} /> : null}</Group>
  </Canvas></Animated.View>;
});
function Star({x,y,index,clock,width,height,animated}: {x:number;y:number;index:number;clock:SharedValue<number>;width:number;height:number;animated:boolean}) {
  const opacity=useDerivedValue(()=>animated ? .4+Math.sin(clock.value*.8+index*1.7)*.25:.3);
  return <Circle cx={width*x/100} cy={height*y/100} r={index%3===0 ? .4 : .25} color="#E7DEF9" opacity={opacity} />;
}
export const HomeAtmosphere = memo(function HomeAtmosphere({ disabled=false, light=false }: { disabled?:boolean; light?:boolean }) {
  const {width,height}=useWindowDimensions(); const {animated,lowPower,reduced}=useHomeMotion(disabled); const clock=useSharedValue(0);const last=useSharedValue(0);
  const frame=useFrameCallback(info=>{if(info.timestamp-last.value>=1000/30){last.value=info.timestamp;clock.value=info.timestamp/1000;}});
  useEffect(()=>{frame.setActive(animated);return()=>frame.setActive(false);},[animated,frame]);
  const resolution=useMemo(()=>[width/4,height/4],[width,height]);const uniforms=useDerivedValue(()=>({resolution,time:clock.value,light:light?1:0}));
  if (lowPower) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {backgroundShader ? <Canvas style={{position:'absolute',width:width/4,height:height/4,left:width*3/8,top:height*3/8,transform:[{scale:4}]}}><Fill><Shader source={backgroundShader} uniforms={uniforms} /></Fill>{!light&&!reduced?[[9,15],[77,12],[92,35],[15,56],[71,65],[87,84],[36,9],[43,49],[5,83],[58,30]].map(([x,y],i)=><Star key={i} x={x!} y={y!} index={i} clock={clock} width={width/4} height={height/4} animated={animated} />):null}</Canvas> : null}
  </View>;
});
function RevealWord({ children, index, disabled, color }: { children:React.ReactNode;index:number;disabled:boolean;color:string }) {
  const progress=useSharedValue(disabled?1:0);
  useEffect(()=>{progress.value=disabled?1:withDelay(index*18,withTiming(1,{duration:380,easing:Easing.out(Easing.cubic)}));},[disabled,index,progress]);
  const style=useAnimatedStyle(()=>({opacity:progress.value,transform:[{translateY:(1-progress.value)*10}],textShadowColor:color,textShadowOffset:{width:0,height:0},textShadowRadius:(1-progress.value)*6}));
  return <Animated.Text style={style}>{children}</Animated.Text>;
}
export const HomeTitle=memo(function HomeTitle({ name,greeting,colors,disabled,fontsReady }: { name:string;greeting:string;colors:Colors;disabled:boolean;fontsReady:boolean }) {
  const {reduced}=useHomeMotion(disabled); const family=fontsReady?'CKaiHomeSans':undefined;
  const words=(greeting+',').split(' ');
  const nameStyle:TextStyle={fontFamily:family,fontSize:28,lineHeight:36,fontWeight:'500',letterSpacing:-1};
  return <View style={{alignItems:'center',gap:4,width:'100%'}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:6,maxWidth:'100%'}}>
    <Text style={{fontFamily:family,fontSize:15,lineHeight:24,color:colors.muted,letterSpacing:0}}>{words.map((word,index)=><RevealWord key={index} index={index} disabled={reduced} color={colors.ink}>{word+' '}</RevealWord>)}</Text>
    <Animated.View entering={reduced?undefined:FadeInDown.delay(36).duration(420)} accessible accessibilityRole="header" accessibilityLabel={name} style={{maxWidth:'100%',flexShrink:1}}>
      <MaskedView maskElement={<Text style={[nameStyle,{color:'#000'}]}>{name}.</Text>}><LinearGradient colors={colors.bg === '#FAF8F4' ? ['#7751B6','#187F8A','#A14E83'] : ['#C9A8FB','#85D7E8','#E4ACD6']} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={[nameStyle,{opacity:0}]}>{name}.</Text></LinearGradient></MaskedView>
    </Animated.View></View>
    <Text accessibilityRole="header" style={{fontFamily:fontsReady?'CKaiHomeSerif':'serif',fontSize:30,lineHeight:40,textAlign:'center',color:colors.ink,marginTop:6,letterSpacing:-.4}}>{['Fais','place','à','tes','idées.'].map((word,index)=><RevealWord key={word} index={index+3} disabled={reduced} color={colors.ink}>{word+' '}</RevealWord>)}</Text>
  </View>;
});
export const GlassCard=memo(function GlassCard({ title,detail,icon,colors,index,onPrompt,prompt,disabledMotion,haptics,blurTarget,light=false }: { title:string;detail:string;icon:IconName;colors:Colors;index:number;onPrompt(value:string):void;prompt:string;disabledMotion:boolean;haptics:boolean;blurTarget:React.RefObject<React.ComponentRef<typeof View>|null>;light?:boolean }) {
  const {reduced}=useHomeMotion(disabledMotion); const scale=useSharedValue(1);const turn=useSharedValue(0);const [pressed,setPressed]=useState(false);
  useEffect(()=>{if(pressed&&!reduced)turn.value=withRepeat(withTiming(360,{duration:1800,easing:Easing.linear}),-1);else cancelAnimation(turn);return()=>cancelAnimation(turn);},[pressed,reduced,turn]);
  const style=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));const border=useAnimatedStyle(()=>({transform:[{rotate:`${turn.value}deg`}]}));
  return <Animated.View style={[{width:'45%',flexGrow:1},style]} entering={reduced?undefined:FadeInDown.delay(180+index*60).springify().damping(18).stiffness(180)}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={()=>onPrompt(prompt)} onPressIn={()=>{setPressed(true);if(!reduced)scale.value=withSpring(.97,spring);if(haptics)void Haptics.selectionAsync().catch(()=>{});}} onPressOut={()=>{setPressed(false);scale.value=withSpring(1,spring);}} style={{borderRadius:20,padding:1,overflow:'hidden',backgroundColor:colors.line}}>
      {pressed?<Animated.View pointerEvents="none" style={[{position:'absolute',width:280,height:280,left:'50%',top:'50%',marginLeft:-140,marginTop:-140},border]}><LinearGradient colors={tokens.gradient} style={{flex:1}} /></Animated.View>:null}
      <View style={{borderRadius:19,overflow:'hidden',minHeight:112,padding:16,backgroundColor:light?'#FFFFFFA8':'#181722AE'}}>
        <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" tint={light?'light':'dark'} intensity={22} style={StyleSheet.absoluteFill} />
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><View style={{width:28,height:28,borderRadius:10,backgroundColor:light?'#9E89C112':'#C7ABFF12',alignItems:'center',justifyContent:'center'}}><Icon name={icon} color={colors.accent} size={17} /></View><Text style={{fontSize:9,color:colors.muted,letterSpacing:1}}>{String(index+1).padStart(2,'0')}</Text></View>
        <Text style={{color:colors.ink,fontSize:13,lineHeight:20,fontWeight:'600'}}>{title}</Text><Text style={{color:colors.muted,fontSize:11,lineHeight:17,marginTop:3}}>{detail}</Text>
      </View>
    </Pressable>
  </Animated.View>;
});
export function SendControl({ busy,enabled,onPress,colors,reduced=false }: { busy:boolean;enabled:boolean;onPress():void;colors:Colors;reduced?:boolean }) {
  const system=useReducedMotion();const progress=useSharedValue(busy?1:0);const glow=useSharedValue(enabled?1:0);
  useEffect(()=>{progress.value=withTiming(busy?1:0,{duration:reduced||system?0:220});},[busy,reduced,system,progress]);
  useEffect(()=>{glow.value=withTiming(enabled||busy?1:0,{duration:reduced||system?0:180});},[enabled,busy,reduced,system,glow]);
  const shape=useAnimatedStyle(()=>({borderRadius:interpolate(progress.value,[0,1],[20,13]),opacity:interpolate(glow.value,[0,1],[.24,1]),transform:[{scale:interpolate(glow.value,[0,1],[.94,1])}]}));
  const arrow=useAnimatedStyle(()=>({opacity:1-progress.value,transform:[{translateY:progress.value*-5},{scale:1-progress.value*.25}]}));const square=useAnimatedStyle(()=>({opacity:progress.value,transform:[{scale:.5+progress.value*.5}]}));
  return <Pressable accessibilityRole="button" accessibilityLabel={busy?'Arrêter la réponse':'Envoyer'} disabled={!busy&&!enabled} onPress={onPress} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Animated.View style={[{width:40,height:40,overflow:'hidden',alignItems:'center',justifyContent:'center',shadowColor:colors.accent,shadowOpacity:.4,shadowRadius:12,elevation:enabled?5:0},shape]}><LinearGradient colors={tokens.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} /><Animated.View style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center'},arrow]}><Icon name="arrow-up" color="#21172F" size={21} /></Animated.View><Animated.View style={[{width:13,height:13,borderRadius:3,backgroundColor:'#21172F'},square]} /></Animated.View></Pressable>;
}
