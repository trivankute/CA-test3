const assert=require('node:assert/strict');
const FP=require('./floating.js'),H=require('./half-addition.js'),M=require('./half-multiplication.js');
const native=new Float16Array(1),word=new Uint16Array(native.buffer);
let seed=987654,count=0;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(const f of [3,4,5])for(const mode of ['nearest-even','nearest-ties-zero']){
  // Enumerate the format independently through native binary16 values.
  const unit=2**f,values=Array.from({length:31*unit},(_,i)=>{
    word[0]=i<<(10-f);return native[0];
  });
  const threshold=(values.at(-1)+65536)/2;
  function quantize(value){
    if(Number.isNaN(value))return NaN;
    const sign=value<0||Object.is(value,-0)?1<<(f+5):0,m=Math.abs(value);
    if(m>threshold||(m===threshold&&mode==='nearest-even'))return sign|(31<<f);
    let lo=0,hi=values.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(values[mid]<=m)lo=mid;else hi=mid-1;}
    let chosen=lo;
    if(lo+1<values.length){
      const lower=m-values[lo],upper=values[lo+1]-m;
      if(lower>upper||(lower===upper&&mode==='nearest-even'&&lo%2))chosen++;
    }
    if(chosen<unit&&m!==0)return 0;
    return sign|chosen;
  }
  function value(bits){
    word[0]=((bits>>(f+5))<<15)|((bits&((1<<(f+5))-1))<<(10-f));return native[0];
  }
  for(let i=0;i<2000;i++){
    const a=(random()-.5)*2**Math.floor(random()*38-16),b=(random()-.5)*2**Math.floor(random()*38-16);
    const x=value(quantize(a)),y=value(quantize(b));
    for(const [result,exact] of [[H.add(String(a),String(b),mode,f),x+y],[M.multiply(String(a),String(b),mode,f),x*y]]){
      const expected=quantize(exact);
      assert.equal(result.fields.join('').length,6+f);
      if(Number.isNaN(expected))assert.equal(result.decoded.kind,'NaN');
      else assert.equal(parseInt(result.fields.join(''),2),expected,`${f} ${mode}: ${a}, ${b}`);
      count++;
    }
  }
  for(const [api,operation] of [[H,H.add],[M,M.multiply]])for(const type of ['tie','overflow','underflow']){
    for(let i=0;i<30;i++){
      const [a,b]=api.generate(type,random,f),result=operation(a,b,mode,f);
      if(type==='tie')assert.deepEqual([result.rounding.guard,result.rounding.round,result.rounding.sticky],[1,0,0]);
      if(type==='overflow')assert.equal(result.decoded.kind,'infinity');
      if(type==='underflow')assert.equal(result.underflow,true);
    }
  }
  const conversion=M.explainOperand('-80.7494',mode,f);
  assert.equal(conversion.kept.split('.')[1].length,f);
  assert.deepEqual(conversion.stored.fields,H.store('-80.7494',mode,f).fields);
}
console.log(`PASS: ${count} reduced-format operations against independent native-value enumeration, both rounding rules, 3–5 fraction bits, focused generators and operand conversion.`);
