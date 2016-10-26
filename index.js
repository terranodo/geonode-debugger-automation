const fetch = require('node-fetch');
const Promise = require('promise');
const MapConfigTransformService = require('./MapConfigTransformService.js');

let sources = [];
let configs = [];
const fetchConfigFromUrl = (url) => {
  return fetch(url).then((response) => {
    if(response.status == 200) {
      return response.json();
    }
  }).then((json) => {
    if(json) {
      for (var key of Object.keys(json.sources)) {
        var source = json.sources[key];
        const config = createMinimalConfig(source);
        var result = MapConfigTransformService.transform(config);
        if(result.layers.length !== 1) {
          configs.push({url: url, source: source});
          if(sources.indexOf(source.ptype) === -1) {
            sources.push(source.ptype);
          }
        }
      }
    }
  });
};
const createMinimalConfig = (source) => {
  let minimalConfig = {'map': { 'layers': [{'name': '1', 'source': '1'}]}, 'sources':{}};
  minimalConfig.sources = { '1': source };
  return minimalConfig;
};
const urls = ['http://geosm.adpc.net/maps/193/data', 'http://geosm.adpc.net/maps/193/data'];
const promises = urls.map( (url) => {
  return fetchConfigFromUrl(url)
});
Promise.all(promises).then( (done) => {
  console.log('Sources: ',sources);
  console.log('Configs: ',configs);
});
