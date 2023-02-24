# TODO

Stuff and things.

## Stuff

- [X] Provide the ability to specify a list of dashboards to send and be able to
  be able to get the dashboards PNGs and embed them in an email
- [X] Add Markdown support
- [X] Manifest and bundled template support in lambda
- [X] Add channel support in lambda
- [X] Markdown support in lambda
- [X] Document Lambda environment variables
- [X] Report channels - Email
- [X] Report channels - S3
- [X] Add ability to do other types of files, e.g. CSV
- [X] Add option to skip PDF render and send raw file
- [ ] YAML report engine
- [X] Rename Dockerfile-cli to Dockerfile
- [ ] Specify time period for dashboard reports
- [ ] Specify time period for query reports
- [ ] Community report repository
- [ ] Add Pino
- [ ] Add New Relic agent support to CLI
- [ ] Add slack channel channel
- [ ] Push reports to nerdstorage, generic nerdlet to show reports in nerdstorage
- [ ] Rename channels to destinations
- [ ] Add ability to specify channel params at CLI using ;key=value
- [X] Honor template path when rendering email templates
- [ ] Send report summary custom events
- [ ] Switch from `Promise.all` to custom concurrent promise handler
- [ ] Add support for output filename from env var and document `outputFilename`
- [ ] Support non-file output
- [ ] Collect any caught errors during reports and surface them on response
- [ ] Add variable substitution support to queries
- [ ] Support global GraphQL/NRQL timeout in `config` section
- [ ] Support global concurrency setting in `config`  section
- [ ] Allow reports to throw exceptions rather than return null and
  use try/catch in engine.
- [ ] Run reports concurrently
- [ ] Run manifest reports by name

## Things

- [X] Cron Docker
- [ ] CronJob Kubernetes
- [X] Don't launch browser if no template reports are being run
- [ ] Add commit hooks to lint
- [ ] Add CHANGELOG
- [ ] Add entity search extension
- [ ] Add generic graphql extension
- [ ] Development preview support
- [ ] Express Dockerfile for hitting with Webhook and API for nerdlet
- [ ] Nerdlet using API to generate reports
