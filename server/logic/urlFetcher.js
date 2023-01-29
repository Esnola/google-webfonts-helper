var _ = require('lodash');
var async = require('async');

var conf = require('./conf');
var cssFetcher = require('./cssFetcher');

var debug = require('debug')('gwfh:urlFetcher');

function fetchUrls(font, storeID, callback) {

  var tmpUrlStoreObject = {
    variants: [],
    storeID: storeID
  };

  var cssSubsetString = _.clone(storeID).replace(/_/g, ","); // make the variant string google API compatible...
  debug(cssSubsetString);

  async.each(font.variants, function(variant, variantCB) {

    var variantItem = {
      id: variant
    };

    async.each(_.pairs(conf.USER_AGENTS), function(typeAgentPair, requestCB) {

      cssFetcher(font.family + ":" + variant, cssSubsetString, typeAgentPair[0], typeAgentPair[1], function(err, resources) {
        if (err) {
          requestCB(err);
          return;
        }

        // save the type (woff, eot, svg, ttf, usw...)
        var type = typeAgentPair[0];
        debug(resources);

        if (resources.length === 0) {

          // console.error("no url for type available", type, variantItem);
          requestCB(null);
          return;
        }

        var url = resources[0]._extracted.url;

        // safe the url directly
        // rewrite url to use https instead on http!
        url = url.replace(/^http:\/\//i, 'https://');
        variantItem[type] = url;

        // if not defined, also save procedded font-family, fontstyle, font-weight, unicode-range
        if (_.isUndefined(variantItem.fontFamily) && _.isUndefined(resources[0]["font-family"]) === false) {
          variantItem.fontFamily = resources[0]["font-family"];
        }

        if (_.isUndefined(variantItem.fontStyle) && _.isUndefined(resources[0]["font-style"]) === false) {
          variantItem.fontStyle = resources[0]["font-style"];
        }

        if (_.isUndefined(variantItem.fontWeight) && _.isUndefined(resources[0]["font-weight"]) === false) {
          variantItem.fontWeight = resources[0]["font-weight"];
        }

        if (_.isUndefined(variantItem.local) && _.isUndefined(resources[0].localName) === false) {
          variantItem.local = resources[0].localName;
        }

        // successfully added type of variant, callback...
        requestCB(null);

      });

    }, function(err) {
      if (err) {
        variantCB('A font css request failed: ' + err);
      } else {

        // push complete variantItem to urlStore's variants
        tmpUrlStoreObject.variants.push(variantItem);

        variantCB();
      }
    });

  }, function(err) {
    if (err) {
      console.error('fetchUrls bubbled err ' + err + ' for font ' + font + ' storeID ' + storeID);
      callback(null)

    } else {
      debug("All variants processed.");

      // stable sort variants
      // tmpUrlStoreObject.variants = _.sortBy(tmpUrlStoreObject.variants, ["fontWeight", "fontStyle"]);
      tmpUrlStoreObject.variants = _.sortBy(tmpUrlStoreObject.variants, function ({ fontWeight, fontStyle }) {
        var styleOrder = fontStyle === "normal" ? 0 : 1;
        return `${fontWeight}-${styleOrder}`
      });

      // return the processed urlStoreObject...
      callback(tmpUrlStoreObject);
    }
  });
}

module.exports = fetchUrls;
