'strict'

const mode = (array) => {
  const map = new Map();
  let maxFreq = 0;
  let mode;

  for(const item of array) {
    let freq = map.has(item) ? map.get(item) : 0;
    freq++;

    if(freq > maxFreq) {
      maxFreq = freq;
      mode = item;
    }
    
    map.set(item, freq);
  }

  return mode;
};


module.exports = {
 parseSpotlight : function(data){

  results = {}

  if (data.Resources){
    data.Resources.forEach((r)=>{
      var type = 'misc'
      if (r['@types'].search('Schema:Organization')>-1){
        type = 'org'
      }else if (r['@types'].search('Schema:Place')>-1){
        type = 'loc'
      }else if (r['@types'].search('Schema:Person')>-1){
        type = 'per'
      }
      if (!results[r['@surfaceForm']]){

        results[r['@surfaceForm']] = {
        'text' : r['@surfaceForm'],
        'type' : [],
        'uri'  : r['@URI']
        }
      }
      results[r['@surfaceForm']]['type'].push(type)
    })
  }
  return(results)
},

 parseStanford : function(data){
  results = {}
  var fields = ['LOCATION','ORGANIZATION','DATE','MONEY','PERSON','PERCENT','TIME']
  var map = {'LOCATION':'loc','ORGANIZATION':'org','DATE':'date','MONEY':'money','PERSON':'per','PERCENT':'number','TIME':'tim'}
  fields.forEach((field)=>{
    if (data[field]){
      data[field].forEach((d)=>{        
        if (!results[d]) results[d] = {'text':d,'type':[]}
        results[d].type.push(map[field])
      })
    }
  })
  return(results)
},

 parseOpener : function(data){
  results = {}
  var map = {"PER":'per','MISC':'misc','LOC':'loc','TIME':'tim','DATE':'date'}

  if (data.entities){
    Object.keys(data.entities).forEach((r)=>{

      r = data.entities[r]

      var type = 'misc'
      if (map[r.type]){
        type = map[r.type]
      } 

      if (!results[r.text]){
        results[r.text] = {
        'text' : r.text,
        'type' : []
        }
      }
      results[r.text]['type'].push(type)
    })
  }
  return(results)
},

 parseSpacy : function(data){
  results = {}
  var map = {'ORG':'org','NORP':'misc','GPE':'loc','DATE':'date','PERSON':'per'}
  if (data){
    data.forEach((r)=>{

      var type = 'misc'
      if (map[r.type]){
        type = map[r.type]
      } 


      if (!results[r.text]){
        results[r.text] = {
        'text' : r.text,
        'type' : []
        }
      }
      results[r.text]['type'].push(type)
    })
  }
  return(results)
},
 parseNltk : function(data){
  results = {}
  var map = {'org':'org','eve':'misc','geo':'loc','tim':'tim','per':'per'}
  if (data){
    data.forEach((r)=>{
      var type = 'misc'
      if (map[r.type]){
        type = map[r.type]
      } 
      if (!results[r.value]){
        results[r.value] = {
        'text' : r.value,
        'type' : []
        }
      }
      results[r.value]['type'].push(type)
    })
  }
  return(results)
},
 parseParsey : function(data){
  results = {}

    data.forEach((r)=>{
      if (!results[r.clean]){
        results[r.clean] = {
        'text' : r.clean,
        'type' : []
        }
      }
    })
  return(results)
},
 combineData : function(allData){

  var numberOfTools = allData.length
  var allWords = {}


    allData.forEach((d)=>{

      if (d.data){
        // console.log(d.data)
        Object.keys(d.data).forEach((word)=>{
          word = d.data[word]
          if (!allWords[word.text]){
            allWords[word.text]  =  {'text':word.text, 'type':[], spotlightUri:null, tool: []}
          }
          if (word.type){
            word.type.forEach((t)=>{
              allWords[word.text].type.push(t)  
            })          
          }

          if (allWords[word.text].tool.indexOf(d.tool) === -1){
            allWords[word.text].tool.push(d.tool)
          }
          if (word.uri) allWords[word.text].spotlightUri = word.uri

        })
      }
    })

    Object.keys(allWords).forEach((key)=>{
      allWords[key].confidence = parseInt(allWords[key].tool.length / numberOfTools * 100)
      allWords[key].typeMode = mode(allWords[key].type)
    })  

    
    return(allWords)

  },
  

  nerParsey : function(results,foldLookup){
    var words = []
    var compelted_words = []
    var compelted_words_results = []

    for (var line in results){
      for (var word in results[line]){
        w = results[line][word]
        if (w['label'] === 'PROPN' && w['token'][0] === w['token'][0].toUpperCase()){
          words.push(w) 
        }
      }


      var propn_groups = []
      var group = []
      // loop through all the proper nouns and try to link multiple words together based on sequential index order
      // console.log(words)

      words.forEach((w)=>{


        if (group.length==0){
          group.push(w)
        }else if (group[group.length-1].index===w.index-1){
          group.push(w)
          // console.log(group)

          if (w['token'].search(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g)>-1){
            propn_groups.push(group)
            group = []              
          }

        }else{
          propn_groups.push(group)
          group = [w]
        }

      })
      // build the words from the groups
      propn_groups.forEach((g)=>{
        var word = []
        g.forEach((w)=>{
          // console.log(w['token'])
          if (foldLookup[w['token']]){
            word.push(foldLookup[w['token']])
          }
        })

        word = word.join(' ').trim()
        if (compelted_words.indexOf(word)===-1){
          compelted_words.push(word)
        }
      })


  
    }
    // clean them up and return 
    compelted_words.forEach((w)=>{
      if (w.trim()!==''){
        var clean_word_string = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ").replace(/\s+/,' ').trim()
        compelted_words_results.push({'clean':clean_word_string,'original':w.replace(/\s+/,' ').trim()})
      }
    })
    return(compelted_words_results)
  },

  old_nerParsey : function(results,foldLookup){
    var words = []
    var compelted_words = []
    var compelted_words_results = []

    for (var line in results){
      for (var word in results[line]){
        w = results[line][word]
        
        if (w['feats'] && w['feats']['fPOS']){
          if ((w['feats']['fPOS'] == 'PROPN++NNP' || w['feats']['fPOS'] == 'NOUN++NNS') && w['xpostag'] != 'NN' && w['xpostag'] != 'PRP' ){
            if (w['form'][0] === w['form'][0].toUpperCase()){
              words.push(w) 
            }
            
          }       
        }
      }
      var compelted_ids = []
      for (var word in words){
        var w = words[word]
        if (compelted_ids.indexOf(w['id'])>-1){
          continue
        }
        var final_words = [w]

        // see if this word continues
        for (var word2 in words){
          var w2 = words[word2]
          if (w2['id'] != w['id'] && w2['id'] === w['id']+1){

            final_words.push(w2)
            compelted_ids.push(w2['id'])
            if (/[,.?\-]/.test(w2['form'])) {
              break
            }
            w = w2
          }

        }
        
        if (final_words.length>0){
          var word_string = ''
          final_words.forEach((x)=>{
            word_string = word_string + x['form'] + ' '
          })

          word_string = word_string.split(' ')
          let newPhrase = []
          word_string.forEach((w)=>{
            newPhrase.push(foldLookup[w])
          })
          word_string = newPhrase.join(' ')

          var clean_word_string = word_string.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ").replace(/\s+/,' ').trim()
          if (compelted_words.indexOf(clean_word_string)===-1){
            compelted_words.push(clean_word_string)
            compelted_words_results.push({'clean':clean_word_string,'original':word_string.replace(/\s+/,' ').trim()})
          }
        }             
      }        
    }
    return(compelted_words_results)
  }

}

// async.map(useTools, function(tool, cb) {
//   request({url:`https://nerserver.semlab.io/`, timeout: 15000, method:'POST',json: {text:sometext, tool:tool} }, function(err,httpResponse,body){ 
//     if (!err){
//       cb(null, {tool:tool,data:body,error:false,errorMsg:null});
//     }else{
//       cb(null, {tool:tool,data:null,error:true,errorMsg:err});
//     }
//   }); 
// }, function(err, results) {
//   compiledResults = []
//   errors = []
//   errorTools = []
//   var map = {"spacy":parseSpacy,"parsey":parseParsey,"nltk":parseNltk,"stanford":parseStanford,"opener":parseOpener,"spotlight":parseSpotlight}
//   results.forEach((r)=>{
//     if (r.error){
//       errors.push(`Error with ${r.tool}: ${JSON.stringify(r.errorMsg)}`)
//       errorTools.push(r.tool)
//       return
//     }
//     if (map[r.tool]){
//       compiledResults.push({'tool':r.tool, 'data':map[r.tool](r.data)})
//     }
//   })
//   compiledResults = combineData(compiledResults)
//   compiledResults.errors = errors
//   compiledResults.errorTools = errorTools
//   console.log(compiledResults)
// });



