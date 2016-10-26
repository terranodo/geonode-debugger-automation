/*
 * Copyright 2015-present Boundless Spatial Inc., http://boundlessgeo.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Transforms GXP style map config to our internal format.
 */
class MapConfigTransformService {
  transform(data, opt_proxy) {
    var i, ii, layers = [];
    var groups = {};
    for (i = 0, ii = data.map.layers.length; i < ii; ++i) {
      var layer = data.map.layers[i];
      var source = data.sources[layer.source];
      var url = source.url;
      if (opt_proxy) {
        url = opt_proxy + source.url;
      }
      var layerConfig = {
        properties: {
          isRemovable: true,
          visible: layer.visibility,
          title: layer.title || layer.name.split(':').pop(),
          id: layer.name,
          name: layer.name
        }
      };
      if (source.ptype === 'gxp_osmsource') {
        layerConfig.type = 'Tile';
        layerConfig.source = {
          type: 'OSM',
          properties: {
            crossOrigin: 'anonymous'
          }
        };
      } else if (source.ptype === 'gxp_arcrestsource') {
        layerConfig.type = 'Tile';
        layerConfig.source = {
          type: 'TileArcGISRest',
          properties: {
            crossOrigin: 'anonymous',
            urls: [url],
            params: {
              LAYERS: layer.layerid,
              FORMAT: layer.format
            }
          }
        };
      } else if (source.ptype === 'gxp_wmscsource') {
        layerConfig.properties.popupInfo = '#AllAttributes';
        if (layer.capability) {
          layerConfig.properties.isSelectable = layer.capability.queryable;
          layerConfig.properties.isWFST = layer.capability.queryable;
          layerConfig.properties.styleName = layer.capability.styles[0].name;
          layerConfig.properties.legendUrl = layer.capability.styles[0].legend.href;
          layerConfig.properties.EX_GeographicBoundingBox = layer.capability.llbbox;
        }
        layerConfig.type = 'Tile';
        var params = {
          LAYERS: layer.name,
          TILED: 'TRUE'
        };
        if (layer.styles) {
          params.STYLES = layer.styles;
        }
        if (layer.format) {
          params.FORMAT = layer.format;
        }
        if (layer.transparent !== undefined) {
          params.TRANSPARENT = layer.transparent;
        }
        layerConfig.source = {
          type: 'TileWMS',
          properties: {
            crossOrigin: 'anonymous',
            params: params,
            url: url
          }
        };
      } else if (source.ptype === 'gxp_mapboxsource') {
        var urls = [
          'http://a.tiles.mapbox.com/v1/mapbox.' + layer.name + '/',
          'http://b.tiles.mapbox.com/v1/mapbox.' + layer.name + '/',
          'http://c.tiles.mapbox.com/v1/mapbox.' + layer.name + '/',
          'http://d.tiles.mapbox.com/v1/mapbox.' + layer.name + '/'
        ];
        var attribution = /^world/.test(layer.name) ?
          '<a href="http://mapbox.com">MapBox</a> | Some Data &copy; OSM CC-BY-SA | <a href="http://mapbox.com/tos">Terms of Service</a>' :
          '<a href="http://mapbox.com">MapBox</a> | <a href="http://mapbox.com/tos">Terms of Service</a>';
        var maxZoom = {
          'blue-marble-topo-bathy-jan': 8,
          'blue-marble-topo-bathy-jul': 8,
          'blue-marble-topo-jan': 8,
          'blue-marble-topo-jul': 8,
          'control-room': 8,
          'geography-class': 8,
          'natural-earth-hypso': 6,
          'natural-earth-hypso-bathy': 6,
          'natural-earth-1': 6,
          'natural-earth-2': 6,
          'world-dark': 11,
          'world-light': 11,
          'world-glass': 10,
          'world-print': 9
        };
        layerConfig.type = 'Tile';
        layerConfig.source = {
          type: 'TMS',
          properties: {
            attributions: [attribution],
            format: 'png',
            urls: urls,
            maxZoom: maxZoom[layer.name]
          }
        };
      } else if (source.ptype === 'gxp_bingsource') {
        layerConfig.type = 'Tile';
        layerConfig.source = {
          type: 'BingMaps',
          properties: {
            key: source.apiKey,
            imagerySet: layer.name
          }
        };
      } else {
        layerConfig = undefined;
      }
      if (layerConfig !== undefined) {
        if (layer.group) {
          if (layer.group === 'background') {
            layerConfig.properties.type = 'base';
          }
          if (!groups[layer.group]) {
            groups[layer.group] = {
              type: 'Group',
              properties: {
                title: layer.group === 'background' ? 'Base Maps' : layer.group,
                type: layer.group === 'background' ? 'base-group' : undefined
              },
              children: []
            };
            layers.push(groups[layer.group]);
          }
          groups[layer.group].children.push(layerConfig);
        } else {
          layers.push(layerConfig);
        }
      }
    }
    return {
      layers: layers,
      view: {
        center: data.map.center,
        projection: data.map.projection,
        zoom: data.map.zoom
      }
    };
  }
}

export default new MapConfigTransformService();
