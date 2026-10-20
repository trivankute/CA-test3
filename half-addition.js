(function(root) {
  'use strict';
  const FP = typeof module !== 'undefined' && module.exports ? require('./floating.js') : root.Floating;
  const ZERO = ['0','00000','0000000000'];
  function store(decimal) {
    const rawFields=FP.encode(decimal,5,10);
    const underflow=rawFields[1]==='00000' && FP.parseDecimal(decimal).numerator!==0n;
    const fields=underflow?[...ZERO]:rawFields;
    return { decimal:FP.plainDecimal(decimal),rawFields,fields,underflow,decoded:FP.decode(fields,5,10) };
  }
  function binaryAt(coefficient,power) {
    if(!coefficient) return '0.0000000000';
    const raw=BigInt(coefficient).toString(2);
    const point=raw.length+power;
    if(point<=0) return '0.'+'0'.repeat(-point)+raw;
    if(point>=raw.length) return raw+'0'.repeat(point-raw.length)+'.0';
    return raw.slice(0,point)+'.'+raw.slice(point);
  }
  function grs(coefficient,cut) {
    let retained,guard=0,round=0,sticky=0;
    if(cut<=0) retained=coefficient<<BigInt(-cut);
    else {
      retained=coefficient>>BigInt(cut);
      guard=Number((coefficient>>BigInt(cut-1))&1n);
      if(cut>=2) round=Number((coefficient>>BigInt(cut-2))&1n);
      if(cut>2) sticky=(coefficient&((1n<<BigInt(cut-2))-1n))!==0n?1:0;
    }
    const increment=!!(guard&&(round||sticky||retained%2n===1n));
    return { retained:retained.toString(),guard,round,sticky,increment,
      rounded:(retained+(increment?1n:0n)).toString() };
  }
  function roundingReason(rounding,negative=false) {
    const {guard,round,sticky}=rounding,last=Number(BigInt(rounding.retained)%2n);
    if(guard===0) return round||sticky ? 'G = 0: the discarded part is below halfway. Keep the retained bits.' : 'G = R = S = 0: the result is exact. Keep the retained bits.';
    const direction=negative?' Increasing the magnitude makes this negative result more negative; its sign stays 1.':'';
    if(round===0&&sticky===0) return `G = 1, R = 0, S = 0: exactly halfway. The retained last bit is ${last} (${last?'odd':'even'}). ${last?'Increment the magnitude so the rounded last bit becomes 0 (even).':'Keep the retained bits because their last bit is already 0 (even).'}${last?direction:''}`;
    return 'G = 1 and R or S is 1: the discarded part is above halfway. Increment the magnitude.'+direction;
  }
  function add(aText,bText) {
    const a=store(aText),b=store(bText),x=a.decoded,y=b.decoded;
    if(!Number.isFinite(x.value)||!Number.isFinite(y.value)) {
      const invalid=x.kind==='infinity'&&y.kind==='infinity'&&x.sign!==y.sign;
      const sign=x.kind==='infinity'?x.sign:y.sign;
      const fields=invalid?['0','11111','1000000000']:[String(sign),'11111','0000000000'];
      return { a,b,fields,decoded:FP.decode(fields,5,10),special:true,underflow:false };
    }
    const commonExponent=Math.max(x.power+10,y.power+10);
    const power=Math.min(x.power,y.power);
    const signed=operand=>(operand.sign?-1n:1n)*BigInt(operand.coefficient)<<BigInt(operand.power-power);
    const total=signed(x)+signed(y),magnitude=total<0n?-total:total;
    const sign=total<0n?1:total===0n&&x.sign===1&&y.sign===1?1:0;
    const exact=FP.dyadicText(magnitude,power,sign);
    const exponent=magnitude===0n?null:magnitude.toString(2).length-1+power;
    const roundExponent=exponent===null?-14:Math.max(-14,exponent);
    const rounding=grs(magnitude,roundExponent-10-power);
    const stored=store(exact);
    return { a,b,fields:stored.fields,rawFields:stored.rawFields,decoded:stored.decoded,
      underflow:stored.underflow,exact,power,exponent,commonExponent,rounding,
      alignedA:binaryAt(x.coefficient,x.power-commonExponent),
      alignedB:binaryAt(y.coefficient,y.power-commonExponent),
      exactBinary:binaryAt(magnitude,power),
      normalized:exponent===null?'0':binaryAt(magnitude,power-exponent),
      alignedSum:binaryAt(magnitude,power-commonExponent),sign };
  }
  function generate(type='mixed',random=Math.random) {
    const ri=(a,b)=>a+Math.floor(random()*(b-a+1));
    if(type==='mixed') type=['ordinary','ordinary','tie','sticky','cancellation','overflow','underflow'][ri(0,6)];
    const sign=ri(0,1);
    if(type==='example') return ['26.125','0.4150390625'];
    if(type==='negative-tie') return ['-42.59375','-0.015625'];
    if(type==='overflow') return [sign?'-65504':'65504',FP.dyadicText(1,ri(5,15),sign)];
    if(type==='underflow') {
      const m=ri(1025,2047),difference=ri(1,m-1024);
      return [FP.dyadicText(m,-24,sign),FP.dyadicText(m-difference,-24,1-sign)];
    }
    if(type==='tie') {
      const e=ri(-3,10);
      return [FP.dyadicText(ri(1024,2047),e-10,sign),FP.dyadicText(1,e-11,sign)];
    }
    if(type==='sticky') return [sign?'-1':'1',sign?'-0.0001':'0.0001'];
    if(type==='cancellation') {
      const e=ri(-5,10),m=ri(1044,2047),d=ri(0,20);
      return [FP.dyadicText(m,e-10,sign),FP.dyadicText(m-d,e-10,1-sign)];
    }
    return [FP.randomDecimal(random),FP.randomDecimal(random)];
  }
  const api={store,add,grs,binaryAt,roundingReason,generate};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.HalfAddition=api;
})(typeof globalThis==='undefined'?this:globalThis);
