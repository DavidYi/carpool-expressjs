const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const bodyParser = require('body-parser');

const Ride = require('../models/ride');
const User = require('../models/user');
const authMiddleWare = require('../middleware/auth-middleware');

router.use(bodyParser.json());

// if (process.env.NODE_ENV !== 'test') {
//     router.use(authMiddleWare);
// }

router.use(authMiddleWare);


const includes = (array, username) => {
  for (let i = 0; i < array.length; i += 1) {
    if (array[i].username === username) return true;
  }
  return false;
};


/**
 * Returns all rides.
 */
router.get('/', (request, response) => {
  // 'find' returns all objects matching the given query - and all objects match the empty query "{}".

  // Most db operations take a function as their second argument, which is called after the query completes. This
  // function executes after the operation finishes - if there's an error, the first argument (err) is true. If not,
  // the second argument (rides) contains our results.
  Ride.find({}, (err, rides) => {
    if (err) {
      return response.status(500); // db error (500 internal server error)
    }
    if (!rides) {
      return response.status(404); // not found (404 not found)
    }
    response.status(200).send(rides); // success - send the rides!
  });
});

router.get('/:ride_id', (req, res) => {
  Ride.findById(req.params.ride_id, (err, ride) => {
    if (err) res.status(500);
    if (!ride) res.status(404);
    res.status(200).send(ride);
  });
});

function pastrides(callback) {
  const currentTime = Date.now();
  Ride.find({ departing_datetime: { $lt: currentTime } }, (err, rides) => {
    callback(err, rides);
  });
}

/*
  Get all past rides.
*/

router.get('/past/all/', (req, res) => {
  // TODO: figure out query & comparison time

  pastrides((err, rides) => {
    if (err) {
      console.log('Getting past rides: db error 500');
      return res.status(500); // db error (500 internal server error)
    }
    if (!rides) {
      console.log('Getting past rides: not found 404');
      return res.staus(404); // not found (404 not found)
    }
    console.log('Getting past rides: rides round D:<');
    res.status(200).send(rides);
  });
});

/*
    Get all past rides for a specific user
 */

router.get('/past/user/:user', (req, res) => {
  const currentTime = new Date().getTime();

  User.find({ username: req.params.user }, (err, user) => {
    if (err) {
      return res.status(500); // db error (500 internal server error)
    }

    // currentuser is an ARRAY containing one element - the user object.
    const currentuser = user;

    // find all rides whose "riders" array contains all the elements in the "currentuser" array - technically
    // only one user.
    const query = { $and: [{ riders: { $all: currentuser } }, { departing_datetime: { $lt: currentTime } }] };

    Ride.find(query, (err, rides) => {
      console.log('Rides', rides);

      if (err) {
        return res.status(500); // db error (500 internal server error)
      }
      if (!rides) {
        return res.status(404); // not found (404 not found)
      }
      res.status(200).send(rides);
    });
  });
});

function futurerides(callback) {
  const currentTime = Date.now();
  Ride.find({ departing_datetime: { $gte: currentTime } }, (err, rides) => {
    callback(err, rides);
  });
}

/*
  Get all rides occurring in the future.
*/

router.get('/future/all/', (req, res) => {
  // TODO: figure out query & comparison time

  futurerides((err, rides) => {
    if (err) {
      return res.status(500); // db error (500 internal server error)
    }
    if (!rides) {
      return res.staus(404); // not found (404 not found)
    }
    res.status(200).send(rides);
  });
});

/*
    Get all future rides for a specific user.
 */
router.get('/future/user/:user', (req, res) => {
  const currentTime = new Date().getTime();

  User.find({ username: req.params.user }, (err, user) => {
    if (err) {
      return res.status(500); // db error (500 internal server error)
    }

    // currentuser is an ARRAY containing one element - the user object.
    const currentuser = user;

    // find all rides whose "riders" array contains all the elements in the "currentuser" array - technically
    // only one user.
    const query = { $and: [{ riders: { $all: currentuser } }, { departing_datetime: { $gte: currentTime } }] };

    Ride.find(query, (err, rides) => {
      console.log('Rides', rides);

      if (err) {
        return res.status(500); // db error (500 internal server error)
      }
      if (!rides) {
        return res.status(404); // not found (404 not found)
      }
      res.status(200).send(rides);
    });
  });
});

/*
  Get all rides containing the user.
*/

router.get('/user/:user', (req, res) => {
  const currentTime = new Date().getTime();

  User.find({ username: req.params.user }, (err, user) => {
    if (err) {
      return res.status(500); // db error (500 internal server error)
    }

    // currentuser is an ARRAY containing one element - the user object.
    const currentuser = user;

    // find all rides whose "riders" array contains all the elements in the "currentuser" array - technically
    // only one user.
    const query = { riders: { $all: currentuser } };

    Ride.find(query, (err, rides) => {
      console.log('Rides', rides);

      if (err) {
        return res.status(500); // db error (500 internal server error)
      }
      if (!rides) {
        return res.status(404); // not found (404 not found)
      }
      res.status(200).send(rides);
    });
  });
});


/**
 * Post a single ride.
 */
router.post('/', (req, res) => {
  console.log(req.body);
  console.log(req);
  User.findOne({ username: req.userData.user }, (err, user) => {
    if (err) res.status(500).send();
    if (!user) res.status(404).send();

      console.log(req.body.number_riders);
    Ride.create({
      departing_datetime: req.body.departing_datetime,
      arriving_at: req.body.arriving_at,
      departing_from: req.body.departing_from,
      number_riders: req.body.number_riders,
      riders: [user._id],
    }, (err, ride) => {
      if (err) return res.status(500).send();
      res.status(200).send(ride);
    });
  });
});

/**
 * Post a user to a ride.
 */
router.post('/:ride_id/book', (req, res) => {
  User.findOne({ username: req.userData.user }, (err, user) => {
    if (err) {
      // console.log("500 error for finding user: " + err)
      res.status(500).send();
    }
    if (!user) res.status(404).send();
    Ride.findById(req.params.ride_id, (err, ride) => {
      if (err) {
        // console.log("500 error for finding ride: " + err)
        res.status(500).send();
      }
      if (includes(ride.riders, user.username)) {
        res.status(403).send('User exists on ride');
      } else {
        // console.log("this is what riders look like: "+ride.riders)
        // console.log("this is what the new rider look like: " + user)
        ride.riders.push(user);
        // console.log("this is what new riders look like:" + ride.riders)
        const newRiders = ride.riders;
        ride.set({ riders: newRiders });
        ride.save((err, newRide) => {
          if (err) {
            console.log(`500 error for saving ride: ${err}`);
            res.status(500).send();
          }
          res.status(200).send(newRide);
        });
      }
    });
  });
});

/**
 * Delete a user from a ride.
 */
router.delete('/:ride_id/:user_id', (req, res) => {
  // if (req.userData.user === req.params.user_id) {

  // Get the ride
  Ride.findById(req.params.ride_id, (err, ride) => {
    if (err) res.status(500).send();
    // console.log("ride:", ride);

    // If this ride is already empty - delete it
    if (ride.riders && ride.riders.length === 0) {
      deleteRide(req.params.ride_id, (err, res) => {
        if (err) { return res.status(500).send(); }
        console.log('ride ', req.params.ride_id, ' was already empty and successfully deleted');
      });
    }

    // Check if the user is part of this ride
    if (ride.riders.some(r => r.username === req.params.user_id)) {
      // Remove the user from this ride
      ride.riders = ride.riders.filter(ele => ele.username !== req.params.user_id);
      console.log('removed user id ', req.params.user_id, 'from ride', req.params.ride_id);

      // If this ride has no users - delete it
      if (ride.riders && ride.riders.length === 0) {
        deleteRide(req.params.ride_id, (err, res) => {
          if (err) { return res.status(500).send(); }
          console.log('ride ', req.params.ride_id, ' is now empty and successfully deleted');
        });
      }

      // Write the changes to the database
      ride.save((err) => {
        if (err) return res.status(500).send();
        return res.status(200).send(ride);
      });
    } else {
      return res.status(404).send('User does not exist on ride!');
    }
  });
  // }
  // else {
  //   return res.status(403).send();
  // }
  // }
});

/**
 * Delete a ride
 */
function deleteRide(ride_id, callback) {
  const myquery = { _id: ride_id };
  Ride.deleteOne(myquery, (err, ride) => {
    callback(err, ride);
  });
}

/**
 * Endpoint Delete a ride.
 */
router.delete('/:ride_id', (req, res) => {
  console.log('deleting ride ', req.params.ride_id);
  deleteRide(req.params.ride_id, (err, ride) => {
    if (err) { return res.status(500).send(); }
    console.log('ride ', req.params.ride_id, ' was successfully deleted');
    ride.status(200).send(ride);
  });
});


module.exports = router;
