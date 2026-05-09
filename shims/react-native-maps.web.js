const React = require('react');
const { View } = require('react-native');

const MapView = React.forwardRef(function MapView({ style, children }, ref) {
  return React.createElement(View, { style }, children);
});

MapView.Animated = MapView;

const Marker = function Marker() { return null; };
const Callout = function Callout() { return null; };
const Circle = function Circle() { return null; };
const Polygon = function Polygon() { return null; };
const Polyline = function Polyline() { return null; };
const Overlay = function Overlay() { return null; };
const UrlTile = function UrlTile() { return null; };
const Heatmap = function Heatmap() { return null; };
const Geojson = function Geojson() { return null; };

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;
const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
  NONE: 'none',
  MUTEDSTANDARD: 'mutedStandard',
};

module.exports = MapView;
module.exports.default = MapView;
module.exports.MapView = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Circle = Circle;
module.exports.Polygon = Polygon;
module.exports.Polyline = Polyline;
module.exports.Overlay = Overlay;
module.exports.UrlTile = UrlTile;
module.exports.Heatmap = Heatmap;
module.exports.Geojson = Geojson;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.MAP_TYPES = MAP_TYPES;
