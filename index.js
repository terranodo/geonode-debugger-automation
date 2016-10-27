const fetch = require('node-fetch');
const Promise = require('promise');
const MapConfigTransformService = require('./MapConfigTransformService.js');
const csvWriter = require('csv-write-stream');
var fs = require('fs');

let sources = [];
let configs = [];
let dataSources = [];
const writeToCSV = (data, headers) => {
  var writer = csvWriter({ headers: headers });
  writer.pipe(fs.createWriteStream('./sources.csv'));
  data.forEach( (d) => {
    writer.write(d);
  })
  writer.end();
}
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
          dataSources.push({url: url, type: source.ptype, geonode: source.url});
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
  console.log('Sources: ',dataSources);
  writeToCSV(dataSources, ['url', 'type', 'geonode']);
});
