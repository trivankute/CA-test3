(function(root){
  'use strict';
  const FP=typeof module!=='undefined'&&module.exports?require('./floating.js'):root.Floating;
  const H=typeof module!=='undefined'&&module.exports?require('./half-addition.js'):root.HalfAddition;
  function fractionBits(remainder,denominator,count){
    let text='';
    for(let i=0;i<count;i++){
      remainder*=2n;
      const bit=remainder>=denominator;
      text+=bit?'1':'0';if(bit)remainder-=denominator;
    }
    return {text,remainder};
  }
  function explainOperand(decimal,roundingMode='nearest-even'){
    const parsed=FP.parseDecimal(decimal),n=parsed.numerator,d=parsed.denominator;
    const integer=n/d,remainder=n%d,rawFraction=fractionBits(remainder,d,32);
    const trim=part=>part.remainder!==0n?part.text:(part.text.replace(/0+$/,'')||'0');
    const fraction=trim(rawFraction)+(rawFraction.remainder!==0n?'…':'');
    const signed=parsed.sign?'-':'';
    const fractionalDecimal=FP.plainDecimal(`${remainder}e-${d.toString().length-1}`);
    const stored=H.store(decimal,roundingMode);
    if(n===0n)return {fractionalDecimal,fractionalBinary:'0.0',rawBinary:signed+'0.0',zero:true,stored};
    let exponent=n.toString(2).length-d.toString(2).length;
    if(exponent>=0?n<(d<<BigInt(exponent)):(n<<BigInt(-exponent))<d)exponent--;
    const scaled=e=>e>=0?[n,d<<BigInt(e)]:[n<<BigInt(-e),d];
    const [normalizedN,normalizedD]=scaled(exponent);
    const normalizedFraction=fractionBits(normalizedN%normalizedD,normalizedD,24);
    const normalized=signed+'1.'+trim(normalizedFraction)+(normalizedFraction.remainder!==0n?'…':'');
    const roundExponent=Math.max(-14,exponent),[roundN,roundD]=scaled(roundExponent);
    const tail=fractionBits(roundN%roundD,roundD,12),integerPart=roundN/roundD;
    const retained=(integerPart<<10n)+BigInt('0b'+tail.text.slice(0,10));
    const guard=Number(tail.text[10]),round=Number(tail.text[11]),sticky=tail.remainder!==0n?1:0;
    const increment=!!(guard&&(round||sticky||(roundingMode==='nearest-even'&&retained%2n===1n)));
    return {fractionalDecimal,fractionalBinary:'0.'+fraction,
      rawBinary:signed+integer.toString(2)+'.'+fraction,normalized,exponent,roundExponent,
      kept:integerPart.toString(2)+'.'+tail.text.slice(0,10),guard,round,sticky,increment,stored};
  }
  function multiply(aText,bText,roundingMode='nearest-even'){
    const a=H.store(aText,roundingMode),b=H.store(bText,roundingMode),x=a.decoded,y=b.decoded,sign=x.sign^y.sign;
    if(!Number.isFinite(x.value)||!Number.isFinite(y.value)){
      const invalid=(x.kind==='infinity'&&y.kind==='zero')||(y.kind==='infinity'&&x.kind==='zero');
      const fields=invalid?['0','11111','1000000000']:[String(sign),'11111','0000000000'];
      return {a,b,sign,fields,decoded:FP.decode(fields,5,10),special:true,underflow:false};
    }
    const magnitude=BigInt(x.coefficient)*BigInt(y.coefficient),power=x.power+y.power;
    const exact=FP.dyadicText(magnitude,power,sign);
    const exponent=magnitude===0n?null:magnitude.toString(2).length-1+power;
    const exponentSum=power+20;
    const roundExponent=exponent===null?-14:Math.max(-14,exponent);
    const rounding=H.grs(magnitude,roundExponent-10-power,roundingMode),stored=H.store(exact,roundingMode);
    return {a,b,sign,fields:stored.fields,rawFields:stored.rawFields,decoded:stored.decoded,
      underflow:stored.underflow,exact,exponent,exponentSum,rounding,
      significandA:H.binaryAt(x.coefficient,-10),significandB:H.binaryAt(y.coefficient,-10),
      rawProduct:H.binaryAt(magnitude,-20),normalized:exponent===null?'0':H.binaryAt(magnitude,power-exponent),
      normalizationShift:exponent===null?0:exponent-exponentSum};
  }
  function generate(type='mixed',random=Math.random){
    const ri=(a,b)=>a+Math.floor(random()*(b-a+1));
    if(type==='mixed')type=['ordinary','ordinary','tie','normalization','sticky','overflow','underflow'][ri(0,6)];
    const sa=ri(0,1),sb=ri(0,1);
    if(type==='example')return ['26.125','0.4150390625'];
    if(type==='conversion')return ['-80.7494','-0.2236'];
    if(type==='overflow')return [sa?'-65504':'65504',FP.dyadicText(ri(2,8),0,sb)];
    if(type==='underflow')return [FP.dyadicText(1,-14,sa),FP.dyadicText(1,ri(-8,-1),sb)];
    if(type==='tie')return [FP.dyadicText(1536,ri(-3,3)-10,sa),FP.dyadicText(1025+2*ri(0,170),ri(-3,3)-10,sb)];
    if(type==='normalization')return [FP.dyadicText(ri(1536,2047),ri(-4,5)-10,sa),FP.dyadicText(ri(1536,2047),ri(-4,5)-10,sb)];
    if(type==='sticky')return [FP.dyadicText(1025+2*ri(0,511),ri(-4,5)-10,sa),FP.dyadicText(1025+2*ri(0,511),ri(-4,5)-10,sb)];
    if(type==='zero')return ['0',FP.dyadicText(ri(1024,2047),ri(-5,5)-10,sb)];
    const ordinary=sign=>{
      const whole=ri(0,2)===0?0:ri(1,99),fraction=ri(1,9999);
      return (sign?'-':'')+whole+'.'+String(fraction).padStart(4,'0').replace(/0+$/,'');
    };
    return [ordinary(sa),ordinary(sb)];
  }
  const api={multiply,generate,explainOperand};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HalfMultiplication=api;
})(typeof globalThis==='undefined'?this:globalThis);
