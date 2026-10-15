
const sections=[
  ['hinos','🎵','Hinos'],
  ['cifras','🎸','Cifras'],
  ['escalas','📅','Escalas'],
  ['avisos','📣','Avisos'],
  ['integrantes','👥','Integrantes'],
  ['devocionais','📖','Devocionais'],
  ['letras','📝','Letras']
];

const examples={
  hinos:[
    {titulo:'Deus de Obras Completas',descricao:'Refrão: todos',data:'Próximo ensaio'},
    {titulo:'Espírito da Verdade',descricao:'Refrão: todos'}
  ],
  cifras:[{titulo:'Cifras do repertório',descricao:'Adicione links de PDFs ou cifras na planilha compartilhada.'}],
  escalas:[{titulo:'Escala do próximo culto',descricao:'Preencha data, equipe e observações na planilha.'}],
  avisos:[{titulo:'Bem-vindos ao Kadosh App!',descricao:'Os avisos publicados pelos líderes aparecerão aqui.'}],
  integrantes:[{titulo:'Equipe Kadosh',descricao:'Cadastre apenas nomes autorizados para divulgação.'}],
  devocionais:[{titulo:'Tudo seja feito para a glória de Deus',descricao:'1 Coríntios 10:31'}],
  letras:[]
};

let active='hinos';
const cache={};
const $=id=>document.getElementById(id);

function csvParse(text){
  const rows=[];
  let row=[],field='',quoted=false;

  for(let i=0;i<text.length;i++){
    let c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){
        field+='"';
        i++;
      }else quoted=!quoted;
    }else if(c===','&&!quoted){
      row.push(field);
      field='';
    }else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(field);
      if(row.some(x=>x.trim()))rows.push(row);
      row=[];
      field='';
    }else field+=c;
  }

  row.push(field);
  if(row.some(x=>x.trim()))rows.push(row);
  if(!rows.length)return[];

  let heads=rows.shift().map(x=>x.trim().toLowerCase());

  return rows.map(r=>Object.fromEntries(
    heads.map((h,i)=>[h,(r[i]||'').trim()])
  )).filter(x=>x.titulo||x.descricao);
}

function make(tag,text,cls){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text)el.textContent=text;
  return el;
}

function safeUrl(link){
  try{
    const u=new URL(link);
    return ['https:','http:'].includes(u.protocol)?u.href:null;
  }catch{
    return null;
  }
}

function render(items){
  $('content').replaceChildren();
  $('count').textContent=`${items.length} item(ns)`;

  if(!items.length){
    $('content').append(make('p','Nenhum conteúdo publicado ainda.','muted'));
    return;
  }

  for(const x of items){
    let card=make('article',null,'item');
    card.append(make('h3',x.titulo||'Sem título'));

    for(const key of ['data','descricao','responsavel','tom']){
      if(x[key]&&!(active==='letras'&&key==='responsavel')){
        card.append(make('p',
          (key==='data'?'📅 ':
           key==='responsavel'?'Responsável: ':
           key==='tom'?'Tom: ':'')+x[key]
        ));
      }
    }

    const url=safeUrl(x.link);

    if(url){
      if(active==='letras'){
        const img=make('img');
        img.src=url;
        img.alt='Letra do hino '+(x.titulo||'');
        img.loading='lazy';
        img.decoding='async';
        img.style.cssText='display:block;width:100%;height:auto;max-height:75vh;object-fit:contain;margin-top:12px;border-radius:10px;background:#fff;';

        const anchor=make('a');
        anchor.href=url;
        anchor.target='_blank';
        anchor.rel='noopener noreferrer';
        anchor.title='Abrir imagem para ampliar';
        anchor.append(img);
        card.append(anchor);

        const open=make('a','🔍 Abrir imagem para ampliar ↗');
        open.href=url;
        open.target='_blank';
        open.rel='noopener noreferrer';
        card.append(open);

        img.onerror=()=>{
          img.style.display='none';
          const msg=make('p','Não foi possível mostrar a imagem aqui. Tente abrir pelo link abaixo.','muted');
          anchor.before(msg);
        };
      }else{
        let a=make('a','Abrir material ↗');
        a.href=url;
        a.target='_blank';
        a.rel='noopener noreferrer';
        card.append(a);
      }
    }

    $('content').append(card);
  }
}

async function show(id){
  active=id;
  let meta=sections.find(s=>s[0]===id);
  $('heading').textContent=meta[2];

  document.querySelectorAll('.nav button').forEach(b=>{
    b.classList.toggle('active',b.dataset.section===id);
    b.setAttribute('aria-pressed',String(b.dataset.section===id));
  });

  const url=(window.KADOSH_CONFIG||{})[id];

  if(!url){
    $('status').textContent=id==='letras'
      ?'Aguardando configuração da planilha de letras.'
      :'Exemplos de demonstração — configure a planilha para publicar conteúdos reais.';
    render(examples[id]);
    return;
  }

  if(cache[id])render(cache[id]);
  $('status').textContent='Atualizando conteúdos…';

  try{
    let res=await fetch(url,{cache:'no-store'});
    if(!res.ok)throw Error('HTTP '+res.status);

    let rows=csvParse(await res.text());
    cache[id]=rows;

    if(active===id){
      render(rows);
      $('status').textContent='Conteúdo carregado da planilha compartilhada.';
    }
  }catch(e){
    if(active===id){
      $('status').textContent='Não foi possível atualizar. Confira o link CSV e sua conexão.';
      render(cache[id]||[]);
    }
  }
}

for(const [id,emoji,label]of sections){
  let b=make('button');
  b.type='button';
  b.dataset.section=id;
  b.append(make('span',emoji),document.createTextNode(label));
  b.onclick=()=>show(id);
  $('nav').append(b);
}

show('hinos');

if('serviceWorker'in navigator){
  window.addEventListener('load',()=>
    navigator.serviceWorker.register('./sw.js').catch(()=>{})
  );
}
