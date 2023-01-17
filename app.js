var pmx = require("pmx");
const pm2 = require("pm2");
const async = require("async");
const pkg = require("./package.json");
const child_process = require("child_process");
const sd = require("silly-datetime");

var Probe = pmx.probe();

var app_updated = Probe.counter({
  name: "Updates",
});

function autoPull(cb) {
  pm2.list(function (err, procs) {
    if (err) return console.error(err);

    async.forEachLimit(
      procs,
      1,
      function (proc, next) {
        if (proc.pm2_env && proc.pm2_env.versioning) {
          let time = sd.format(new Date(), "YYYY-MM-DD HH:mm:ss");
          child_process.exec(
            "git pull",
            { cwd: proc.pm2_env.versioning.repo_path },
            function (error, stdout, stderr) {
              if (error !== null) {
                console.log("exec error: " + error);
              } else {
                console.log(time + " " + stdout);
                console.log(
                  ">>>>>>>>>>>>> Successfully pulled Application! [App name: %s]",
                  proc.name
                );
              }
            }
          );
        } else next();
      },
      cb
    );
  });
}

pmx.initModule(
  {
    widget: {
      type: "generic",
      theme: ["#111111", "#1B2228", "#807C7C", "#807C7C"],

      el: {
        probes: true,
        actions: true,
      },

      block: {
        actions: true,
        issues: true,
        meta: true,
        cpu: true,
        mem: true,
      },

      // Status
      // Green / Yellow / Red
    },
  },
  function (err, conf) {
    pm2.connect(function () {
      console.log("pm2-auto-pull module connected to pm2");

      var running = false;

      setInterval(function () {
        if (running == true) return false;

        running = true;
        autoPull(function () {
          running = false;
        });
      }, conf.interval || 30000);
    });
  }
);
