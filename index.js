const fetch = require('node-fetch');
const Promise = require('promise');
const MapConfigTransformService = require('./MapConfigTransformService.js');
const csvWriter = require('csv-write-stream');
var fs = require('fs');

let distinctSources = [];
let configs = [];
let dataSources = [];
let numberOfSources = 0;
const writeToCSV = (data, headers, fileName) => {
  var writer = csvWriter({ headers: headers });
  writer.pipe(fs.createWriteStream('./'+fileName));
  data.forEach( (d) => {
    writer.write(d);
  })
  writer.end();
}
const fetchMapsFromUrl = (url) => {
  return fetch(url+'/api/maps').then((response) => {
    if(response.status == 200) {
      return response.json();
    }else {
      console.log('status: ', response);
    }
  }).then((json) => {
    if(json) {
      return Promise.all(json.objects.map(function (object) {
        if(object.detail_url) {
          return url+object.detail_url+'/data';
        }
      }));
    }else {
      console.log('no json: ');
    }
  }).catch((error) => {
    console.log('error: ',error);
  });
};
const fetchConfigFromUrl = (url) => {
  return fetch(url).then((response) => {
    if(response.status == 200) {
      return response.json();
    }else {
      console.log('status: ', response);
    }
  }).then((json) => {
    if(json) {
      for (var key of Object.keys(json.sources)) {
        var source = json.sources[key];
        let config = createMinimalConfig(source);
        var result = MapConfigTransformService.transform(config);
        if(result.layers.length !== 1) {
          configs.push({url: url, source: source});
          dataSources.push({url: url, type: source.ptype, geonode: source.url});
          if(distinctSources.indexOf(source.ptype) === -1) {
            console.log('push source type: ', source.ptype);
            distinctSources.push(source.ptype);
          }
        }
      }
      const sourceLength = Object.keys(json.sources).length;
      if(sourceLength) {
        numberOfSources += sourceLength;
        return sourceLength;
      } else {
      }
    } else {
      console.log('no json', json);
    }
  }).catch((error) => {
    console.log('error: ',error);
  });
};
const createMinimalConfig = (source) => {
  let minimalConfig = {'map': { 'layers': [{'name': '1', 'source': '1'}]}, 'sources':{}};
  minimalConfig.sources = { '1': source };
  return minimalConfig;
};
const geonodes = ['http://zansea-geonode.org','http://ebolageonode.org', 'http://demo.geonode.org', 'http://geosm.adpc.net', 'http://secondarycities.geonode.state.gov', 'http://data.adriplan.eu',];
const geonodeMapsPromise = geonodes.map( (url) => {
  return fetchMapsFromUrl(url);
});
Promise.all(geonodeMapsPromise).then( (urls) => {
  return Promise.all(urls.map((geonodeUrls) => {
    return Promise.all(geonodeUrls.map( (url) => {
      return fetchConfigFromUrl(url);
    }));
  }));
}).then( (done) => {
  console.log('done', numberOfSources);
  console.log('sources', distinctSources);
  writeToCSV(dataSources, ['url', 'type', 'geonode'], "sources_long.csv");
  console.log('sources', distinctSources);
  var writer = csvWriter({headers: ['type']});
  writer.pipe(fs.createWriteStream('./sources_distinct.csv'));
  distinctSources.forEach( (d) => {
    writer.write([d]);
  })
  writer.end();
});
