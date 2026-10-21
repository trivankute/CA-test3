(function(root) {
  'use strict';
  const FP = typeof module !== 'undefined' && module.exports ? require('./floating.js') : root.Floating;
  function store(decimal,roundingMode='nearest-even',f=10) {
    const rawFields=FP.encode(decimal,5,f,roundingMode);
    const underflow=rawFields[1]==='00000' && FP.parseDecimal(decimal).numerator!==0n;
    const fields=underflow?['0','00000','0'.repeat(f)]:rawFields;
    return { decimal:FP.plainDecimal(decimal),rawFields,fields,underflow,decoded:FP.decode(fields,5,f) };
  }
  function binaryAt(coefficient,power) {
    if(!coefficient) return '0.0000000000';
    const raw=BigInt(coefficient).toString(2);
    const point=raw.length+power;
    if(point<=0) return '0.'+'0'.repeat(-point)+raw;
    if(point>=raw.length) return raw+'0'.repeat(point-raw.length)+'.0';
    return raw.slice(0,point)+'.'+raw.slice(point);
  }
  function grs(coefficient,cut,roundingMode='nearest-even') {
    let retained,guard=0,round=0,sticky=0;
    if(cut<=0) retained=coefficient<<BigInt(-cut);
    else {
      retained=coefficient>>BigInt(cut);
      guard=Number((coefficient>>BigInt(cut-1))&1n);
      if(cut>=2) round=Number((coefficient>>BigInt(cut-2))&1n);
      if(cut>2) sticky=(coefficient&((1n<<BigInt(cut-2))-1n))!==0n?1:0;
    }
    const increment=!!(guard&&(round||sticky||(roundingMode==='nearest-even'&&retained%2n===1n)));
    return { retained:retained.toString(),guard,round,sticky,increment,
      rounded:(retained+(increment?1n:0n)).toString() };
  }
  function roundingReason(rounding,negative=false,roundingMode='nearest-even') {
    const {guard,round,sticky}=rounding,last=Number(BigInt(rounding.retained)%2n);
    if(guard===0) return round||sticky ? 'G = 0: the discarded part is below halfway. Keep the retained bits.' : 'G = R = S = 0: the result is exact. Keep the retained bits.';
    const direction=negative?' Increasing the magnitude makes this negative result more negative; its sign stays 1.':'';
    if(round===0&&sticky===0&&roundingMode==='nearest-ties-zero') return 'G = 1, R = 0, S = 0: exactly halfway. Under the selected classroom rule, keep the retained bits regardless of their last bit. Do not increment the magnitude.';
    if(round===0&&sticky===0) return `G = 1, R = 0, S = 0: exactly halfway. The retained last bit is ${last} (${last?'odd':'even'}). ${last?'Increment the magnitude so the rounded last bit becomes 0 (even).':'Keep the retained bits because their last bit is already 0 (even).'}${last?direction:''}`;
    return 'G = 1 and R or S is 1: the discarded part is above halfway. Increment the magnitude.'+direction;
  }
  function add(aText,bText,roundingMode='nearest-even',f=10) {
    const a=store(aText,roundingMode,f),b=store(bText,roundingMode,f),x=a.decoded,y=b.decoded;
    if(!Number.isFinite(x.value)||!Number.isFinite(y.value)) {
      const invalid=x.kind==='infinity'&&y.kind==='infinity'&&x.sign!==y.sign;
      const sign=x.kind==='infinity'?x.sign:y.sign;
      const fields=invalid?['0','11111','1'+'0'.repeat(f-1)]:[String(sign),'11111','0'.repeat(f)];
      return { a,b,fields,decoded:FP.decode(fields,5,f),special:true,underflow:false };
    }
    const commonExponent=Math.max(x.power+f,y.power+f);
    const power=Math.min(x.power,y.power);
    const signed=operand=>(operand.sign?-1n:1n)*BigInt(operand.coefficient)<<BigInt(operand.power-power);
    const total=signed(x)+signed(y),magnitude=total<0n?-total:total;
    const sign=total<0n?1:total===0n&&x.sign===1&&y.sign===1?1:0;
    const exact=FP.dyadicText(magnitude,power,sign);
    const exponent=magnitude===0n?null:magnitude.toString(2).length-1+power;
    const roundExponent=exponent===null?-14:Math.max(-14,exponent);
    const rounding=grs(magnitude,roundExponent-f-power,roundingMode);
    const stored=store(exact,roundingMode,f);
    return { a,b,fields:stored.fields,rawFields:stored.rawFields,decoded:stored.decoded,
      underflow:stored.underflow,exact,power,exponent,commonExponent,rounding,
      alignedA:binaryAt(x.coefficient,x.power-commonExponent),
      alignedB:binaryAt(y.coefficient,y.power-commonExponent),
      exactBinary:binaryAt(magnitude,power),
      normalized:exponent===null?'0':binaryAt(magnitude,power-exponent),
      alignedSum:binaryAt(magnitude,power-commonExponent),sign };
  }
  function generate(type='mixed',random=Math.random,f=10) {
    const ri=(a,b)=>a+Math.floor(random()*(b-a+1));
    if(type==='mixed') type=['ordinary','ordinary','tie','sticky','cancellation','overflow','underflow'][ri(0,6)];
    const sign=ri(0,1),unit=2**f;
    if(type==='example') return ['26.125','0.4150390625'];
    if(type==='negative-tie') return [FP.dyadicText(unit+Math.min(339,unit-1),5-f,1),FP.dyadicText(1,4-f,1)];
    if(type==='overflow') return [FP.dyadicText(2*unit-1,15-f,sign),FP.dyadicText(1,ri(15-f,15),sign)];
    if(type==='underflow') {
      const m=ri(unit+1,2*unit-1),difference=ri(1,m-unit);
      return [FP.dyadicText(m,-14-f,sign),FP.dyadicText(m-difference,-14-f,1-sign)];
    }
    if(type==='tie') {
      const e=ri(f-13,10);
      return [FP.dyadicText(ri(unit,2*unit-1),e-f,sign),FP.dyadicText(1,e-f-1,sign)];
    }
    if(type==='sticky') return [sign?'-1':'1',sign?'-0.0001':'0.0001'];
    if(type==='cancellation') {
      const e=ri(-5,10),m=ri(unit+Math.min(20,unit-1),2*unit-1),d=ri(0,Math.min(20,unit-1));
      return [FP.dyadicText(m,e-f,sign),FP.dyadicText(m-d,e-f,1-sign)];
    }
    return [FP.randomDecimal(random),FP.randomDecimal(random)];
  }
  const api={store,add,grs,binaryAt,roundingReason,generate};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.HalfAddition=api;
})(typeof globalThis==='undefined'?this:globalThis);
