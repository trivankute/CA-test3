(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const FP=node?require('./floating.js'):root.Floating;
  const Mul=node?require('./multiply.js'):root.Multiply,Div=node?require('./division.js'):root.Division;
  const Add=node?require('./half-addition.js'):root.HalfAddition,Product=node?require('./half-multiplication.js'):root.HalfMultiplication;
  const VERSION=1;
  function generate(seed,mode='nearest-ties-zero'){
    if(!['nearest-even','nearest-ties-zero'].includes(mode))throw new Error('Invalid rounding mode.');
    let state=Number(seed)>>>0;
    const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
    const ri=(a,b)=>a+Math.floor(random()*(b-a+1)),questions=[];
    const field=(id,label,type,expected,hint='')=>({id,label,type,expected,hint});
    const value=(id,label,expected,hint='',digits=6)=>({...field(id,label,'decimal',expected,hint),digits});
    const integer=(id,label,n)=>field(id,label,'integer',String(n));
    const binary=(n,w)=>FP.bits(n,w);
    for(const division of [false,true])for(const refined of [false,true]){
      const n=4,a=ri(8,15),b=ri(2,7),swap=ri(0,1)===1;
      const mc=swap?b:a,mult=swap?a:b;
      const trace=division?(refined?Div.refinedTrace(n,a,b):Div.trace(n,a,b)):(refined?Mul.refinedTrace(n,mc,mult):Mul.trace(n,mc,mult));
      const columns=division?(refined?['Div','REM']:['Q','Div','REM']):(refined?['MC','PROD']:['MULT','MC','PROD']);
      const q={kind:'register',group:'registers',title:`${division?'Division':'Multiplication'} · ${refined?'Refined version':'First version'}`,
        prompt:`Unsigned 4-bit integers: A = ${binary(a,n)}₂ and B = ${binary(b,n)}₂. ${division?'A is the dividend; B is the divisor.':`MC = ${swap?'B':'A'}; MULT = ${swap?'A':'B'}.`} Fill only the initial row (iteration 0) and the final row, after every action of the last iteration.`,
        columns,lastIteration:trace.at(-1).iteration,fields:[],solution:[]};
      columns.forEach((name,i)=>q.fields.push(integer(`width-${i}`,`${name} register width`,trace[0].values[i].length)));
      for(const [row,values] of [['initial',trace[0].values],['final',trace.at(-1).values]])values.forEach((expected,i)=>q.fields.push(field(`${row}-${i}`,`${row==='initial'?'Initial':'Final'} ${columns[i]}`,'bits',expected)));
      q.fields.push(integer('a','A in decimal',a),integer('b','B in decimal',b));
      if(division)q.fields.push(integer('quotient','Quotient in decimal',Math.floor(a/b)),integer('remainder','Remainder in decimal',a%b));
      else q.fields.push(integer('product','Product in decimal',a*b));
      q.solution.push(`A = ${a}; B = ${b}. ${division?`${a} = ${b} × ${Math.floor(a/b)} + ${a%b}.`:`${a} × ${b} = ${a*b}.`}`,
        `Register widths (${columns.join(' | ')}): ${trace[0].values.map(x=>x.length).join(' | ')}.`,
        `Iteration 0: ${trace[0].values.join(' | ')}.`,`Iteration ${trace.at(-1).iteration}: ${trace.at(-1).values.join(' | ')}.`);
      if(division&&refined)q.solution.push('Final REM: upper 4 bits contain the remainder; lower 4 bits contain the quotient.');
      if(division&&!refined)q.solution.push('This first-version algorithm makes n + 1 trials and shifts Div right at the end of every trial, including the last.');
      questions.push(q);
    }
    const limitSpecs=[['max','Largest positive normal'],['minNormal','Smallest positive normal'],['maxSubnormal','Largest positive denormalized (subnormal)'],['minPositive','Smallest positive denormalized (subnormal)']];
    for(const [key,title] of limitSpecs){
      const e=ri(3,4),f=ri(3,4),fmt=FP.format(e,f),limits=FP.limits(e,f),decoded=limits[key];
      const normal=key==='max'||key==='minNormal';
      const fields=key==='max'?['0',binary(2**e-2,e),'1'.repeat(f)]:key==='minNormal'?['0',binary(1,e),'0'.repeat(f)]:['0','0'.repeat(e),key==='maxSubnormal'?'1'.repeat(f):binary(1,f)];
      questions.push({kind:'standard',group:'limits',title,prompt:`Representation: 1 sign bit, ${e} exponent bits, ${f} fraction bits. Bias = ${fmt.bias}. Find the ${title.toLowerCase()} value.`,
        fields:[value('limit','Decimal value',decoded,'Use 4–5 significant digits or the exact value.',4)],
        solution:[`Bit pattern: ${fields.join(' | ')}.`,normal?`Normal: (1 + fraction / ${2**f}) × 2^(E − ${fmt.bias}).`:`Subnormal: (fraction / ${2**f}) × 2^(${fmt.emin}); there is no implicit leading 1.`,`Exact decimal = ${decoded.text}.`]});
    }
    for(let i=0;i<4;i++){
      const sign=ri(0,1)?'-':'',tail=String(ri(100000000,999999999))+String(ri(100,999));
      const decimal=FP.plainDecimal(i===2?`${sign}0.0000${tail}`:`${sign}${ri(1,i===3?3000:99)}.${tail}`);
      const fields=FP.encode(decimal,5,12,mode),decoded=FP.decode(fields,5,12);
      questions.push({kind:'standard',group:'encode',title:'Long decimal → stored bits',prompt:`Encode ${decimal} in the 1–5–12 format (18 bits, bias 15). Round using the selected rule. Subnormals are supported.`,
        fields:[field('encoded','18-bit representation','bits',fields.join(''),'1 sign + 5 exponent + 12 fraction bits. Spaces are allowed.')],
        solution:[`Sign | exponent | fraction = ${fields.join(' | ')}.`,`18 bits = ${fields.join('')}.`,`The stored value decodes to ${decoded.text}.`]});
    }
    for(let i=0;i<4;i++){
      const fields=[String(i===1?1:ri(0,1)),binary(i<2?ri(1,30):i===2?0:31,5),binary(i===3?(ri(0,1)?ri(1,4095):0):ri(1,4095),12)];
      const word=parseInt(fields.join(''),2),hex='0x'+word.toString(16).toUpperCase().padStart(5,'0'),decoded=FP.decode(fields,5,12);
      questions.push({kind:'standard',group:'decode',title:'Stored hexadecimal → decimal',prompt:`The 18-bit 1–5–12 floating-point word is ${hex}. Decode the stored floating-point value. The top 2 bits of the 5-digit hexadecimal display are padding, outside the 18-bit word.`,
        fields:[value('decoded','Decoded decimal value',decoded,'Enter a decimal, +INF, −INF, or NaN. Use at least 6 significant digits; -0 for negative zero.')],
        solution:[`${hex} → ${fields.join(' | ')} (18 stored bits).`,`Classification: ${decoded.kind}.`,`Decoded value = ${decoded.text}.`]});
    }
    for(const multiplication of [false,true]){
      const f=4,api=multiplication?Product:Add,operation=multiplication?Product.multiply:Add.add;
      const type=multiplication?['tie','normalization','sticky'][ri(0,2)]:['tie','cancellation','carry'][ri(0,2)];
      let operands,result;
      do{
        operands=type==='carry'?['1.9375','0.046875']:api.generate(type,random,f);
        result=operation(...operands,mode,f);
      }while(result.special||result.decoded.kind!=='normal'||result.exponent===null||result.exponent < -14);
      const r=result.rounding,retained=BigInt(r.retained).toString(2).padStart(f+1,'0');
      const intermediate=`${result.sign?'-':''}${retained[0]}.${retained.slice(1)}${r.guard}${r.round}`;
      const final=BigInt(result.decoded.coefficient).toString(2).padStart(f+1,'0');
      const significand=`${result.sign?'-':''}${final[0]}.${final.slice(1)}`;
      questions.push({kind:'standard',group:'arithmetic',title:`Floating-point ${multiplication?'multiplication':'addition'}`,prompt:`A = ${operands[0]}; B = ${operands[1]}. Calculate A ${multiplication?'×':'+'} B. Representation: 1 sign, 5 exponent, 4 fraction bits (10 bits total; bias 15). First store A and B using the selected rule, then calculate and normalize.`,
        note:'For the intermediate result, retain 4 fraction bits plus G and R. S is the OR of every bit after R; use it for final rounding, but do not append S to your answer. Include a minus sign on a negative significand. Both exponent answers are biased 5-bit fields.',
        fields:[field('intermediate','Normalized result, with G,R (before final rounding)','significand',intermediate,'Example: -1.1010|10 or -1.101010. Include the implicit leading 1.'),
          field('exponent','Exponent after normalization, before final rounding','bits',binary(result.exponent+15,5),'Biased exponent E = unbiased exponent + 15; exactly 5 bits.'),
          field('significand','Final rounded significand (without G,R)','significand',significand,'Example: -1.1011. Include the implicit leading 1; exactly 4 fraction bits.'),
          field('final-exponent','Final exponent after rounding','bits',result.fields[1],'Exactly 5 bits. A rounding carry can change the exponent.')],
        solution:[`Stored A: ${result.a.fields.join(' | ')} = ${result.a.decoded.text}.`,`Stored B: ${result.b.fields.join(' | ')} = ${result.b.decoded.text}.`,
          `Exact ${multiplication?'product':'sum'} of stored operands = ${result.exact}.`,`Normalized magnitude = ${result.normalized}₂ × 2^(${result.exponent}).`,
          `Intermediate result = ${intermediate.slice(0,-2)}|${intermediate.slice(-2)}; E = ${binary(result.exponent+15,5)}. G = ${r.guard}, R = ${r.round}, S = ${r.sticky}.`,
          Add.roundingReason(r,result.sign===1,mode),`Final significand = ${significand}; E = ${result.fields[1]}.`,`Final bits = ${result.fields.join(' | ')}; decoded value = ${result.decoded.text}.`]});
    }
    return questions.map((q,i)=>({...q,id:`q${i+1}`,number:i+1}));
  }
  function check(raw,field){
    if(field.type==='bits')return FP.checkBits(raw,field.expected);
    if(field.type==='decimal')return FP.checkValue(raw,field.expected,{significantDigits:field.digits});
    if(field.type==='integer'){
      const text=String(raw).trim(),ok=/^\+?\d+$/.test(text)&&BigInt(text)===BigInt(field.expected);
      return {ok,message:'Enter the exact unsigned decimal integer.'};
    }
    const canonical=text=>String(text).replace(/[\s|_]/g,'').replace(/^\+/,'');
    const text=canonical(raw),ok=/^-?1\.[01]+$/.test(text)&&text===canonical(field.expected);
    return {ok,message:`Use a signed binary significand with exactly ${field.expected.split('.')[1].length} bits after the binary point. Check the value and sign.`};
  }
  function answerText(field){return field.type==='decimal'?field.expected.text:String(field.expected);}
  const api={VERSION,generate,check,answerText};
  if(node)module.exports=api;else root.MockTest=api;
})(typeof globalThis==='undefined'?this:globalThis);
