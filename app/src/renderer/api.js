import log from './log';

export function _renewKey () {
  return;
};

export function renewKey () {
  return _renewKey();
};

export function _keyIsValid () {
  return true;
};

export function keyIsValid () {
  return keyIsValid();
};

export function _checkKey (keyIsValid, renewKey) {
  if (!keyIsValid) {
    renewKey();
  }
};

export function checkKey () {
  return _checkKey(keyIsValid, renewKey);
};

export function _getAuthKey (fetch, settings) {
  return new Promise(function (resolve, reject) {
    checkKey();
    fetch("https://api.thetvdb.com/login", {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings.theTVDBLogin)
    })
      .then(r => {
        if (!r.ok) {
          throw (r);
        }
        return r.json();
      })
      .then(function (response) {
        return resolve(response.token);
      })
      .catch(function (error) {
        try {
          if (error.status === 401) {
            log.error("Acces Denied, login info was incorrect");
          };
        } catch (e) {
          log.error(error);
        }
      });
  });
};

export function getAuthKey () {
  return _getAuthKey(fetch, settings);
};

export function _getFromTVDB (fetch, getAuthKey, path) {
  return new Promise(function (resolve, reject) {
    getAuthKey().then(key => {
      fetch(`https://api.thetvdb.com/${path}`, {
        method: 'GET',
        headers: {'Authorization': 'Bearer ' + key,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
        .then(r => r.json())
        .then(r => resolve(r.data))
        .catch(e => reject(Error(e)));
    });
  });
};

export function getFromTVDB (path) {
  return _getFromTVDB(fetch, getAuthKey, path);
};

export function _getFavoriteShowIDs (getFromTVDB) {
  return new Promise(function (resolve, reject) {
    getFromTVDB('user/favorites')
      .then(r => r.favorites)
      .then(resolve)
      .catch(e => reject(Error(e)));
  });
};

export function getFavoriteShowIDs () {
  return _getFavoriteShowIDs(getFromTVDB);
};

export function _getShowInfo (getFromTVDB, id) {
  return new Promise(function (resolve, reject) {
    getFromTVDB(`series/${id}`)
      .then(resolve)
      .catch(e => reject(Error(e)));
  });
};

export function getShowInfo (id) {
  return _getShowInfo(getFromTVDB, id);
};

export function _getSeasons (getFromTVDB, id) {
  return new Promise(function (resolve, reject) {
    getFromTVDB(`series/${id}/episodes/summary`)
      .then(r => resolve(r.airedSeasons))
      .catch(e => reject(Error(e)));
  });
};

export function getSeasons (id) {
  return _getSeasons(getFromTVDB, id);
};

export function _getEpisodes (getFromTVDB, id, season) {
  return new Promise(function (resolve, reject) {
    getFromTVDB(`series/${id}/episodes/query?airedSeason=${season}`)
      .then(resolve)
      .catch(e => reject(Error(e)));
  });
};

export function getEpisodes (id, season) {
  return _getEpisodes(getFromTVDB, id, season);
};

export function _getFanArt (getFromTVDB, id) {
  return new Promise(function (resolve, reject) {
    getFromTVDB(`series/${id}/images/query?keyType=fanart&resolution=1920x1080&subKey=graphical`)
      .then(r => {
        try {
          resolve(`https://thetvdb.com/banners/${r[0].fileName}`);
        } catch (e) {
          resolve(undefined);
        }
      })
      .catch(function (error) {
        if (error.response.status === 404) {
          return resolve(undefined); // Some shows are not populair enough to have fanart :(
        } else {
          reject(Error(error));
        }
      });
  });
};

export function getFanArt (id) {
  return _getFanArt(getFromTVDB, id);
};

export function _proccesShowData (shows) {
  // closure to use it inside the promise
  var showsclosure = shows.map((show) => {
    return {
      added: show.added,
      title: show.seriesName,
      description: show.overview,
      id: show.id,
      episodes: {
        selectedEpisode: {},
        seasons: []
      }
    };
  });
  return new Promise(function (resolve, reject) {
    // No idea if this is stupid unconventional or genius
    // Stupid, async function would have been better
    Promise.all([
      Promise.all(shows.map(show => getFanArt(show.id))),
      Promise.all(shows.map(show => getSeasons(show.id)))
    ])
      .then(function (response) {
        return showsclosure.map((show, i) => {
          show.image = response[0][i];
          show.seasons = response[1][i];
          return show;
        });
      })
      .then(resolve)
      .catch(e => reject(Error(e)));
  });
};

export function proccesShowData (shows) {
  return _proccesShowData(shows);
};

var settings = {};
export function setCredentials (settingsArg) {
  // OK I know this isn't very prety but I'm in a hurry bro
  settings = settingsArg;
};

export function _produceShowData (showIDArray) {
  getAuthKey();
  return new Promise(function (resolve, reject) {
    Promise.all(showIDArray.map(getShowInfo))
      .then(proccesShowData)
      .then(resolve)
      .catch(e => reject(e));
  });
};

export function produceShowData (showIDArray) {
  return _produceShowData(showIDArray);
};
