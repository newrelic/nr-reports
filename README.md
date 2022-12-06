[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

![GitHub forks](https://img.shields.io/github/forks/newrelic-experimental/newrelic-experimental-FIT-template?style=social)
![GitHub stars](https://img.shields.io/github/stars/newrelic-experimental/newrelic-experimental-FIT-template?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/newrelic-experimental/newrelic-experimental-FIT-template?style=social)

![GitHub all releases](https://img.shields.io/github/downloads/newrelic-experimental/newrelic-experimental-FIT-template/total)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/newrelic-experimental/newrelic-experimental-FIT-template)
![GitHub last commit](https://img.shields.io/github/last-commit/newrelic-experimental/newrelic-experimental-FIT-template)
![GitHub Release Date](https://img.shields.io/github/release-date/newrelic-experimental/newrelic-experimental-FIT-template)


![GitHub issues](https://img.shields.io/github/issues/newrelic-experimental/newrelic-experimental-FIT-template)
![GitHub issues closed](https://img.shields.io/github/issues-closed/newrelic-experimental/newrelic-experimental-FIT-template)
![GitHub pull requests](https://img.shields.io/github/issues-pr/newrelic-experimental/newrelic-experimental-FIT-template)
![GitHub pull requests closed](https://img.shields.io/github/issues-pr-closed/newrelic-experimental/newrelic-experimental-FIT-template)

# New Relic Reports

A report generation and automation framework for New Relic.

## Overview

New Relic Reports is a framework for building custom reports and automating
the generation and delivery of those reports via a variety of channels.

### Report Types

The Reports framework supports two types of reports: template based and
dashboard based. providing a simple list of dashboard GUIDs or creating
report template files in HTML or Markdown.

Template based reports use the [Nunjucks](https://mozilla.github.io/nunjucks/)
template engine to process user defined templates. Templates can be authored
using HTML or Markdown. Custom extensions are provided that make it easy to
integrate New Relic charts and data in the report. Report output is rendered
into a PDF using headless Chrome.

Dashboard based reports use Nerdgraph to collect snapshot URLs from one or more
user specified dashboard GUIDs. Snapshot URLs are downloaded as PDFs. When more
than one dashboard is specified, the PDFs can optionally be concatenated into a
single PDF.

### Channel Types

The Reports framework supports different mechanisms for delivering generated
reports. These mechanisms are referred to as channels. The following types of
channels are supported.

* Email: PDFs are attached to an email using a user defined email template and
  sent via SMTP using SMTP settings defined as environment variables.
* S3: PDFs are uploaded to an S3 bucket specified as an environment variable.

### Running Reports

Reports supports three ways to run reports.

1. Using the command line interface (CLI)

   Ad-hoc reports can be run directly from a terminal after cloning or
   downloading the repository and installing dependencies. This is useful
   primarily for testing and debugging reports.

1. Packaged as a Docker image

   `Dockerfile`s are provided to package the Reports engine, along with your
   [templates](#templates) and [manifest file](#manifest-file) as a docker
   image that runs reports on a schedule using `CRON` or that provides a CLI
   based `ENTRYPOINT` that can be run via external scheduled task mechanisms
   such as [AWS ECS Scheduled Tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduled_tasks.html).

1. Packaged as an AWS Lambda function

   [A Dockerfile](./nr-reports-lambda/Dockerfile) is provided to package the
   Reports engine as an AWS Lambda function. The Lambda can be deployed with
   [the provided CloudFormation template](./nr-reports-lambda/cf-template.yaml)
   and [the provided helper scripts](./nr-reports-lambda/scripts).

   The AWS Lambda function is designed to read a single template from a source
   S3 bucket and store the resulting report back into a destination S3 bucket.
   [Manifest file](#manifest-file) and [Dashboard](#dashboard-report-properties)
   support is on [the TODO list](./TODO.md).

## Prerequisites

To develop reports and run them locally, you will need the following.

* Node/NPM >= 12.0.0
* A terminal application that supports Bash scripts
* Your favorite IDE
* For the email channel, SMTP server settings (for testing locally try Mailhog)
* For the S3 channel, AWS credentials and an S3 bucket

To build and deploy CRON based images, you will need the following.

* Docker
* A Docker repository

To build and deploy Lambda based images, you will need the following.

* Docker
* An ECS repository
* The AWS CLI
* AWS credentials

## Installation

```bash
git clone git@github.com:newrelic-experimental/nr-reports.git
cd nr-reports
npm install
```

## Getting Started

Here's how to build a simple "Hello, world!" HTML template that displays a basic
throughput chart for an application named `Shop Service`.

**NOTE:** For this simple tutorial, we will be generating reports interactively
from the command line. While this is convenient for testing things out, one of
the main features of the Reports project is the automation support for
report generation and delivery.

### Before you begin

If you haven't already, make sure you have checked
[the prerequisites](#prerequisites) and [installed the repo](#installation). You
will also need [a New Relic User key](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/#user-api-key).

Then open a terminal that supports Bash scripts and execute the following
commands, making sure to replace `path/to/nr-reports` with the path to the
directory where you cloned the `nr-reports` repository AND `YOUR_USER_KEY`
with your New Relic User key.

```bash
cd path/to/nr-reports
export NEW_RELIC_API_KEY=[YOUR USER KEY]
```

### Copy the example template

Next, copy the example template to a new template named `hello-world.html`.

```bash
cp ./examples/golden-signals.html ./examples/hello-world.html
```

### Update the example template

Next, delete everything in the new template and replace it with the following
content, making sure to replace `Shop Service` with an appropriate APM service
name and `1234567` with the account ID for the service. Then save the template.

```html
{% extends "base/report.html" %}

{% block content %}
<h1>My Application Throughput</h1>
<p>
    This is our application throughput for last week.
</p>
<div>
    {% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
        chartType="AREA",
        accountId=1234567
    %}{% endchart %}
</div>
{% endblock %}
````

Don't worry for now what all that means. It looks more complicated than it is
and will be explained [in the usage section](#usage).

### Run a report

Now run the report using the following command.

```bash
./nr-reports-cli/bin/nr-reports.sh -p examples -n hello-world.html
```

That's it!

There should now be a PDF file in the current directory called
`hello-world.pdf`. Open it up and it should look something like the image below.

![Hello World Report PDF](./screenshots/hello-world.png)

### Add a template parameter

The above template is nice, but it only works for one service because we
hard-coded the application name in the query and the account ID on the `chart`
tag. That isn't very "templatish". Let's see how to templatize the example
above.

First, load `hello-world.html` back into an editor. Now replace the string
`Shop Service` with the string `{{ appName }}` (curly braces and all) and
completely _remove_ the `accountId` parameter (and the `,` after
`chartType="AREA"`).

The `chart` tag should now look something like the following.

```html
<div>
    {% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = '{{ appName }}' SINCE last week UNTIL this week TIMESERIES",
        chartType="AREA"
    %}{% endchart %}
</div>
```

### Create a template parameter values file

Copy the example values file to a new template named `hello-world.json`.

```bash
cp ./examples/values.json ./examples/hello-world.json
```

### Update the example values file

Next, delete everything in the new values file and replace it with the following
content, making sure to replace `Shop Service` with an appropriate APM service
name and `1234567` with the account ID for the service. Then save the file.

```json
{
  "accountId": 1234567,
  "appName": "Shop Service"
}
```

The values file is a JSON file with a flat structure that is a set of key/value
pairs. All we've done above is separate out the account ID and application name
so it isn't hardcoded in the template.

### Re-run the report

First, delete the previous report so we can be sure this run re-creates a new
one.

```bash
rm ./hello-world.pdf
```

Now, run the report using the following command, noting the addition of the `-v`
option that is used to specify the path to the values file.

```bash
./nr-reports-cli/bin/nr-reports.sh -p examples -n hello-world.html -v examples/hello-world.json 
```

Now there should be a new PDF file in the current directory called
`hello-world.pdf`. Open it up and it should look exactly the same as before.
That is because all we did was move the values out of the template. We didn't
actually change the values.

### Run a dashboard report

So far we have been running template reports, i.e. reports based on a template
file. Reports supports another report type called dashboard reports.
Dashboard reports are much simpler. You specify a list of dashboard GUIDs and
the report engine will use Nerdgraph to download a dashboard snapshot PDF for
each dashboard and optionally combine multiple snapshots in a single PDF.

Here's how you run a dashboard report.

### Find your dashboard GUID(s)

The easiest way to find the GUID for a dashboard is via the NR1 UI.

1. Navigate to your dashboard
2. Locate the dashboard name above the filter bar
3. On one side of the dashboard name, locate the box that contains the account
   name and a "tag" icon followed by a number. Click anywhere in the box.
4. In the "drawer" that slides out from the side of the screen, locate the
   label "Entity guid" followed by a long string of numbers and letters (this is
   the dashboard GUID).
5. Hover over the string of numbers and letters and click on the clipboard icon
   that appears. The dashboard GUID will now be copied in the clipboard.

### Run the report

Now run the report using the following command, replacing the string
`ABCDEF123456` with your dashboard GUID.

```bash
./nr-reports-cli/bin/nr-reports.sh -d ABCDEF123456
```

Now there should be a new PDF file in the current directory called
`dashboard-[DASHBOARD_GUID].pdf` where `[DASHBOARD_GUID]` is the GUID of your
dashboard. Open it up and it should look like a snapshot of dashboard for the
last 60 minutes.

### Summary

Here's what we just did.

1. Created a basic HTML template using the [Nunjucks](https://mozilla.github.io/nunjucks/)
   templating syntax that displays a header, a paragraph, and a New Relic
   timeseries chart for the given NRQL query.
2. Modifed the template to use template parameters as placeholders for the
   values that we hardcoded in step 1 by creating a values file.
3. Used the CLI script to run an ad-hoc report at the command line using the
   template and the values file from steps 1 and 2.
4. Without knowing it, used the `file` channel to store the resulting PDF
   report in the current directory.

Though useful during template development, in most cases, you won't be
generating reports by running the CLI directly. Rather, Reports provides
mechanisms for you to automate the generation and delivery of these reports.
See [the usage section](#usage) for more details.

## Usage

### Templates

Template reports are created from templates. Templates are stored in template
files. Template files are plain text documents containing text mixed with
Nunjucks template expressions. Template expressions provide a way to embed
instructions into a text file. These instructions are evaluated when the text
file is passed through [the Nunjucks template "engine"](https://mozilla.github.io/nunjucks/).
This allows template authors to generate dynamic output by embedding logic and
other types of expressions into the text file. Here is a very basic template
file example.

```text
{% for fruit in ['banana', 'orange'] -%}
I want a {{ fruit }}.
{% endfor -%}
```

When the above template is passed through the Nunjucks template engine, it will
produce the following output.

```text
I want a banana.
I want a orange.

```

Nunjucks does not care about the "type" of text file passed to it. For example,
the above file contains just simple plain text. It could just as easily
contain HTML or Markdown or XML. As long as it is a text file, Nunjucks will
scan for template expressions and attempt to process them.

That said, with the exception of template files with the extension `.md`,
Reports passes the template file directly to the Nunjucks engine, and passes
the output from the engine directly to a headless Chrome instance for rendering.
Template files with a `.md` extension are assumed to contain Markdown and are
converted to HTML using [the `showdown` module](https://github.com/showdownjs/showdown)
prior to being processed by the Nunjucks engine.

An example template file is provided in both [HTML format](./examples/golden-signals.html)
and [Markdown format](./examples/golden-signals.md). Use these files as samples
for how to create your own template files. See
[the Nunjucks documentation](https://mozilla.github.io/nunjucks/templating.html)
for more information on the Nunjucks syntax.

#### Template Resolution

When rendering a template, the template engine uses
[the Nunjucks FileSystemLoader](https://mozilla.github.io/nunjucks/api.html#filesystemloader)
to load template files from the local filesystem. The `FileSystemLoader`
resolves the _template name_ passed to the engine into the _template file_ very
much like a shell resolves executables using the `PATH` environment variable.
That is, given a template name and a template "path", the `FileSystemLoader`
resolves the template name to a template file to load by searching each
directory on the template path for the a file matching the template name. For
example, consider the following directory structure.

```text
/app/my-reports
  |- templates
    |- hello-world.html
```

Given the template name `hello-world.html` and the template path
`/app/my-reports/templates`, the `FileSystemLoader` would load the template
from the file `/app/my-reports/templates/hello-world.html`. However, if the
template path were `/app/my-reports`, the `FileSystemLoader` would fail to
find a matching template and the engine would throw an exception.

The template name _may_ include segments separated by the system path separator,
in which case, the `FileSystemLoader` will treat the template name like a
relative path and match it against each directory in the path. For example,
specifying the template name `templates/hello-world.html` would make the failing
case above work fine.

The default template path will always include the current working directory and
the directory `templates` relative to the current working directory.

When running the CLI directly (typically done only during template development),
the [`-p`](#cli-usage) option can be used to specify additional directories for the template
path. When building one of the CLI docker images, all templates from the
template directory specified using the `--template-dir` option when building the
image will be copied into the `templates` directory in the image. So there is
no need to customize the template path.

When building the Lambda image, all templates from the local `templates`
directory relative to the current working directory at build time will be
copied into the `templates` directory in the image. So, again, there is no need
to customize the template path.

### Template Parameters

Template parameters are key-value pairs that are passed to the template engine
when processing a template. Template parameters are used to customize the
processing of a template file and in turn, customize the output from the
template engine.

During processing, a template "variable" is created for each template parameter
using the key of the parameter as the variable name and the value of the
parameter as the value of the variable. Within a template file, template
parameters are referenced by key, just like any other template variable. Here is
a simple example of a template file that references two template variables: one
that is set directly in the template and another that is populated from a
template parameter. Note how the same syntax is used to reference both.

```text
{% set my_name = "Taylor" -%}
{# Output the my_name variable set from this template -#}
Hello, my name is {{ my_name }}.
{#- Output the your_name variable set from a template parameter #}
Nice to meet you, {{ your_name }}.
```

When the above template is processed by the template engine without _any_
template parameters, it will produce the following output.

```text
Hello, my name is Taylor.
Nice to meet you, .

```

Since no template parameters were specified, no variable existed with the
key `your_name` and so there was no one to meet. However, if the above
template is processed with the template parameter `your_name` set to `Jan`,
it will produce the following output.

```text
Hello, my name is Taylor.
Nice to meet you, Jan.

```

To output nothing when no `your_name` parameter is passed, the template can
be modified as follows.

```text
{% set my_name = "Taylor" -%}
{# Output the my_name variable set from this template -#}
Hello, my name is {{ my_name }}.
{#- Output the your_name variable set from a template parameter #}
{% if your_name -%}
Nice to meet you, {{ your_name }}.
{%- endif %}
```

#### Specifying template parameters

Template parameters are specified using JSON. For example, the following JSON
specifies 3 template parameters: 1 string, 1 number, and 1 array of strings.

```json
{
   "accountId": 123456,
   "title": "New Relic Weekly Report",
   "appNames": [ "app1", "app2" ],
}
```

The mechanism for specifying template parameters depends on the way in which
a report is run.

When a report is run using the CLI, template parameters can be specified either
using [a manifest file](#manifest-file) or, if a manifest file is not
specified, using a values file. A values file is simply a JSON file containing
the same JSON that would be used to specify the template parameters in the
manifest file (like the JSON sample above).

When a report is run from a Lambda function, template parameters are specified
in one of the following ways, listed in order of decreasing precedence. In all
cases, the JSON structure is the same as the sample above. The only difference
is how it is passed to the Lambda.

* A JSON string in the `TEMPLATE_PARAMS` environment variable
* The `body` property of the `event` arugment passed to the handler function
* The `params` property of the `event` argument passed to the handler function

Manifest file support for Lambda functions is on [the todo list](./TODO.md).

### Channels

After a report has been run, the generated outputs are distributed via channels.
A channel provides an implementation that sends report outputs to one or more
destinations. The following channels are supported:

* [File](#file-channel)
* [Email](#email-channel)
* [S3](#s3-channel)

All channels support configuration parameters that are used by the channel
implementation to distribute reports via that channel. For example, the file
channel supports a `destDir` configuration parameter that specifies the
destination directory that the report outputs should be copied into. The email
channel supports configuration parameters that specify the SMTP information to
be used to connect to the SMTP server.

Channel configuration parameters can be specified via [a manifest file](#manifest-file),
via environment variables, or using a combination of both. The recommended way
is to use a manifest file as it makes it very clear what values will be used and
it allows for multiple channels of the same type to use different value. For
more details on the supported channel configuration parameters see the specific
sections below.

When a report is run using the CLI, the channels to use are specified at the
command line. For example, the CLI command used in the [Run a report](#run-a-report)
section could have explicitly specified the file channel as follows.

```bash
./nr-reports-cli/bin/nr-reports.sh -p examples -n hello-world.html -c file
```

This is not necessary since the [file channel](#file-channel) is the default.
However, if we wanted to use the [email channel](#email-channel) instead, we
would have to specify it as follows.

```bash
./nr-reports-cli/bin/nr-reports.sh -p examples -n hello-world.html -c email
```

In both of the above cases, the respective channel implementation will attempt
to locate the configuration parameters it needs in the environment and will
default any optional parameters and skip sending the report if any required
parameters can not be found (for example if the `EMAIL_SMTP_HOST` value is
missing or empty).

When a report is run from a lambda function, channel configuration parameters
_must_ be specified using environment variables.

Manifest file support for Lambda functions is on [the todo list](./TODO.md).

#### File Channel

The `file` channel copies all generated report outputs to a destination
directory on the local filesystem. It is mostly meant for development and
testing although it could be used to copy reports to volumes locally attached
to a docker container. The destination directory to use will be determined as
follows, listed in order of decreasing precedence.

* The `destDir` property in the `file` channel configuration from
  [the manifest file](#manifest-file)
* The `FILE_DEST_DIR` environment variable
* The current working directory

Here is an example of specifying a file channel configuration in a
[manifest file](#manifest-file).

```json
[
   {
      "template": "template.html",
      ...
      "channels": [
         {
            "type": "file",
            "destDir": "/tmp"
         }
      ]
   }
]
```

#### Email Channel

The `email` channel generates a single email from a template (not to be
confused with a report template) and sends the email with all generated report
outputs as attachments. Email is sent over SMTP using the
[Nodemailer](https://nodemailer.com/about/) module.

The following configuration parameters are supported for the email channel. Note
that all options can be specified via environment variables and some options can
be specified via channel configuration in a [manifest file](#manifest-file).

| Name | Description | Source | Required | Default |
| --- | --- | --- | --- | --- |
| Recipient(s) | "To" addresses | `to` property in channel config, `EMAIL_TO` environment variable | Y | |
| Sender | "From" address | `from` property in channel config, `EMAIL_FROM` environment variable | Y | |
| Subject | "Subject" line - May contain template expressions! | `subject` property in channel config, `EMAIL_SUBJECT` environment variable | N | `''` |
| Template name | Name of _email_ template for generating email body. [Resolved](#template-resolution) against the template path at run time. | `template` property in channel config, `EMAIL_TEMPLATE` environment variable | N | `''` |
| SMTP Host | SMTP server hostname | `EMAIL_SMTP_SERVER` environment variable | Y | |
| SMTP Port | SMTP server port | `EMAIL_SMTP_PORT` environment variable | N | 587 |
| SMTP Secure | SMTP TLS option - true/yes/on/1 forces TLS, anything else defaults to no TLS unless the server upgrades with `STARTTLS` | `EMAIL_SMTP_SECURE` environment variable | N | true |
| SMTP User | Username for SMTP authentication | `EMAIL_SMTP_USER` environment variable | N | |
| SMTP Password | Password for SMTP authentication - only used if SMTP User is also specified | `EMAIL_SMTP_PASS` environment variable | N | |

Here is an example of specifying an email channel configuration in a
[manifest file](#manifest-file).

```json
   {
      "template": "template.html",
      ...
      "channels": [{
         "type": "email",
         "from": "me@nowhere.local",
         "to": "you@nowhere.local",
         "subject": "{{ title }}",
         "template": "email-template.html"
      }]
   }
```

Along with the supported configuration parameters listed above, any number
of additional parameters may be specified. _All_ parameters, including the
supported ones, as well as all [template parameters](#template-parameters) (if
running a template report)  will be made available to the email template when it
is rendered.

The [default email template](./templates/email/message.html) is located in the
`templates/email` directory.

Because why not? Everyone needs more email.

### S3 Channel

The `s3` channel uploads all generated report outputs to an S3 bucket. The
destination bucket must be specified either using the `bucket` property in the
`s3` channel configuration from [the manifest file](#manifest-file) or using the
`S3_DEST_BUCKET` environment variable.

Here is an example of specifying an s3 channel configuration in a
[manifest file](#manifest-file).

```json
[
   {
      "template": "template.html",
      ...
      "channels": [
         {
            "type": "s3",
            "bucket": "my-bucket"
         }
      ]
   }
]
```

### Manifest File

The recommended way to specify reports to run when invoking the engine is via a
manifest file. A manifest file is a JSON file containing an array of report
definitions. Each report definition is a JSON object with a set of common
properties and one or more additional properties that are particular to the
report type. The following sections show the supported common properties and the
properties supported by each report type.

An [example manifest file](./examples/manifest.json) is provided in the
`examples` directory that shows how to define both a template report and a
dashboard report.

_Note:_ The manifest file _must_ start with an array and not an object.

#### Common Properties

The following properties are common to all report types.

| Property Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| name | The report name/identifier | string | Y | |
| channels | The list of channel configurations to use to distribute report outputs. See the individual sections above for supported configuration values for each channel. | object | N | `[ { "type": "file" }]` |

#### Template Report Properties

| Property Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| template | The template _name_. Must be available on the [template path](#template-resolution) | string | Y | |
| parameters | The [template parameters](#template-parameters) to use for this report | object | N | `{}` |
| isMarkdown | `true` if the template is written in Markdown, `false` if the template is HTML, or omit for "auto" detection by file extension | boolean | N | undefined (auto detect) |

#### Dashboard Report Properties

| Property Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| parameters | Only used by the email channel. The parameters to use when rendering the email template | object | N | `{}` |
| combinePdfs | `true` to combine all PDFs whan more than one dashboard is specified or `false` to use separate PDFs. | boolean | N | undefined |

### Using the CLI

```sh
node index.js ([-f manifest-file] | ([-n name -v values-file] [-p template-path] | [-d dashboards]) [-c channels]) [--verbose] [--debug] [--full-chrome])
```

| Option | Description | Example |
| --- | --- | --- |
| `-f manifest-file` | Render all reports defined in the JSON manifest file `manifest-file`. Takes precedence over `-n` and `-d` and defaults to `manifest.json` if neither `-n` nor `-d` are specified. | `-f manifest.json` |
| `-n name` | Render the template named `name`. `name` must be a template on the template path. Takes precedence over `-d`. | `-n my-report.html` |
| `-p name` | Additional directories for the template path (delimited by the system path separator) | `-p examples:another-dir` |
| `-v values-file` | Run the report using template parameter values defined in the JSON file `values-file`. Ignored with `-f` or `-d`.  | `-v values.json` |
| `-d dashboards` | Download dashboard snapshots for all dashboard GUIDs listed in `dashboards` (comma delimited). Ignored with `-f` or `-n`. | `-d abc123,xyz456` |
| `-c channels` | Send report output files to the channels listed in `channels` (comma delimited) | `-c file,email` |
| `--verbose` | Enable verbose mode | |
| `--debug` | Enable debug mode (be very verbose) | |
| `--full-chrome` | Don't launch Chromium in headless mode (useful for testing templates) | |

#### CLI Examples

The examples shown below use the `./nr-reports-cli/bin/nr-reports.sh`
wrapper.

* Run all reports using the defaults (read reports from `manifest.json` in the
  current working directory)

  `./nr-reports-cli/bin/nr-reports.sh`

* Run all reports defined in the manifest file `my-manifest.json`

  `./nr-reports-cli/bin/nr-reports.sh -f my-manifest.json`

* Run a report using the template named `my-report.html` in the current working
  directory with the values file `my-report-values.json` and copies the result
  report into the current working directory

  `./nr-reports-cli/bin/nr-reports.sh -n my-report.html -v my-report-values.json`

* Run a report using the template named `my-report.html` in the directory
  `/opt/templates` with the values file `my-report-values.json` and upload the
  result report to AWS S3 using the bucket name defined in the `S3_DEST_BUCKET`
  environment variable

  `./nr-reports-cli/bin/nr-reports.sh -n my-report.html -v my-report-values.json -p /opt/templates -c s3`

* Run a report with a snapshot image of the dashboards with GUIDs `A1234` and
  `B1234`, copy the result report into the current working directory, and email
  the result report using the email channel configuration values specified in
  the `EMAIL_*` environment variables

  `./nr-reports-cli/bin/nr-reports.sh -d A1234,B1234 -c file,email`

### Using the CLI image

A [Dockerfile](./nr-reports-cli/Dockerfile) is provided to build a Docker
image that provides an `ENTRYPOINT` that runs the CLI with no arguments. This
image is meant to be used in conjuction with external scheduled task mechanisms
such as [AWS ECS Scheduled Tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduled_tasks.html)
to run reports on a schedule without the need to keep the CRON image running
all the time, since most reports likely run infrequently. It _can_ also be used
as a way to test and debug reports locally without needing to have everything
required to run the CLI available on the local machnine. This can be more
inconvenient than running the CLI directly on the local machine but has the
benefit that it will produce reports in the exact environment they will be run
when the image is deployed.

#### Building the CLI image

In addition to the CLI `Dockerfile`, the [`build.sh`](./nr-reports-cli/scripts/build.sh)
script is provided to simplify building the CLI image. It supports the
following options.

| Option | Description | Example |
| --- | --- | --- |
| `--manifest-file manifest-file` | A local [manifest file](#manifest-file) that specifies reports to run. Will be copied into the images `/app/nr-reports-cli` directory. | `--manifest-file manifest.json` |
| `--template-dir template-dir` | A local directory containing the templates to copy into the images `/app/nr-reports-cli/templates` directory. | `--template-dir templates` |
| `--image-repo image-repository` | The repository to use when tagging the image. Defaults to `nr-reports`. | `--image-repo nr-reports` |
| `--image-tag image-tag` | The tag to use whtn tagging the image. Defaults to `latest`. | `--image-tag 1.0` |

You can either run the script directly or use the `npm run build` command while
in the `./nr-reports-cli` directory.

Here are a few examples.

* Build an image using all the defaults.
  
  ```bash
  cd ./nr-reports-cli
  npm run build
  ```

  The only way this image is useful is if you are going to pass _all_ arguments
  into it when run. In addition, if you are generating any template reports or
  want to use a Manifest file, you would need to mount directories into the
  container when it is run.

* Build an image that will run all reports in `./examples/manifest.json` and
  will include all templates from `./examples` in the image. The image will be
  tagged with `nr-reports:latest` in the local Docker registry.
  
  ```bash
  cd ./nr-reports-cli
  npm run build -- --manifest-file ./examples/manifest.json --template-dir ./examples
  ```

### Using the CRON image

The Dockerfile [`Dockerfile-cron`](./nr-reports-cli/Dockerfile-cron) is
provided to build a Docker image that runs reports on a schedule using `cron`.

#### Building the CRON image

The [`build-cron.sh`](./nr-reports-cli/scripts/build-cron.sh) script is
provided to simplify building a CRON image. It supports the following options.

| Option | Description | Example |
| --- | --- | --- |
| `--manifest-file manifest-file` | A local [manifest file](#manifest-file) that specifies reports to run. Will be copied into the images `/app/nr-reports-cli` directory. Defaults to `manifest.json`. | `--manifest-file manifest.json` |
| `--template-dir template-dir` | A local directory containing the template to copy into the images `/app/nr-reports-cli/templates` directory. | `--template-dir templates` |
| `--cron-entry crontab-entry` | A crontab instruction specifying the cron schedule. Defaults to `0 * * * *`. Make sure to quote the entry string. | `--cron-entry "*     *     *     *     *"` |
| `--image-repo image-repository` | The repository to use when tagging the image. Defaults to `nr-reports-cron`. | `--image-repo nr-reports-cron` |
| `--image-tag image-tag` | The tag to use whtn tagging the image. Defaults to `latest`. | `--image-tag 1.0` |

You can either run the script directly or use the `npm run build-cron` command
while in the `./nr-reports-cli` directory.

Here are a few examples.

* Build an image using all the defaults.
  
  ```bash
  cd ./nr-reports-cli
  npm run build-cron
  ```

  This will build an image that will run all reports the `./manifest.json` once
  an hour. The image will be tagged with `nr-reports-cron:latest` in the local
  Docker registry. Note that if a `manifest.json` file does not exist in the
  current working directory, the build will fail. A manifest file is required
  for the CRON image.

* Build an image that will run all reports in `./examples/manifest.json` every
  day at 04:00 and will include all templates from `./examples` in the image.
  The image will be tagged with `nr-reports-cron:latest` in the local Docker
  registry.

  `./nr-reports-cli/scripts/build-cron.sh --manifest-file ./examples/manifest.json --template-dir ./examples --cron-entry "0     4     *     *     *`

### Using the AWS Lambda function

Reports can be deployed as an AWS Lambda function. The Lambda function can be
combined with other AWS services to trigger report generation in a variety of
ways. For example, an AWS EventBridge trigger can be used to run reports on a
schedule. Or, an Application Load Balancer trigger can be used to expose an
HTTP endpoint for generating reports on demand by making a request to the
endpoint.

#### AWS Lambda Limitations

The AWS Lambda function has several limitations currently.

* The Lambda function does not support using a [manifest file](#manifest-file).
* The Lambda function does not support using Markdown templates.
* The Lambda function does not support channels. The generated report output is
  always written back to the specified S3 bucket.
* The Lambda function does not support dashboard reports.

These limitations will be addressed in future versions.

#### Preparing to deploy or update the Lambda function

Prior to working with the Lambda function, you will need to ensure that you have
the following.

1. An ECR container registry to host the container image built with
   [the Lambda Dockerfile](./nr-reports-lambda/Dockerfile)
2. A [function execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
   that the Lambda function will assume when the function is invoked
3. An S3 bucket that the Lambda function can read from
4. An S3 bucket that the Lambda function can write to
5. Optionally, a Secrets Manager secret in which to store the New Relic User
   API key used by the Lambda

#### Deploying the Lambda function

The Reports AWS Lambda function can be deployed and managed using the scripts
defined in [the scripts directory](./nr-reports-lambda/scripts). These scripts
require the AWS CLI to be installed. It is used to create and manage the AWS
resources required by the Reports Lambda function.

The Lambda function is deployed using [a CloudFormation template](./nr-reports-lambda/cf-template.yaml).
The CloudFormation template accepts a number of parameters which must be
specified when deploying. Parameters are specified using a JSON file with the
following format.

```json
[
   {
      "ParameterKey": "Key1",
      "ParameterValue": "Value1"
   },
   {
      "ParameterKey": "Key2",
      "ParameterValue": "Value2"
   }
]
```

A [sample template parameter file](./nr-reports-lambda/cf-params.sample.json)
is provided the shows an example of using each of the parameters supported by
the template. Documentation for each parameter is provided inline in
[the CloudFormation template](./nr-reports-lambda/cf-template.yaml) as
comments. For example, here is the documentation for the `UserApiKey` parameter.

```yaml
  #
  # New Relic User API key used for GraphQL Nerdstorage queries and mutations.
  #
  # NOTE: It is not recommended to use this. Instead, specify a secret ARN via
  # the UserApiKeySecret parameter.
  #
  UserApiKey:
    Type: String
    Description: The New Relic User API key to use.
    AllowedPattern: '[a-zA-Z0-9._\-]*'
    Default: ''
```

[The `deploy.sh` script](./nr-reports-lambda/scripts/deploy.sh) is used
to deploy the Reports Lambda function. This script will first invoke
[the `build.sh` script](./nr-reports-lambda/scripts/build.sh) to build the
Lambda Docker image using [the Lambda Dockerfile](./nr-reports-lambda/Dockerfile).
The script will then push the image from the local Docker registry to the
registry defined in the `./nr-reports-lambda/cf-params.json` file and use the
`aws cloudformation deploy` command to create the stack using
[the CloudFormation template](./nr-reports-lambda/cf-template.yaml).

To deploy the Lambdda function using the `deploy.sh` script, perform the
following steps.

1. Ensure you are logged into AWS ECR using `aws ecr get-login-password`.
2. Copy the [./nr-reports-lambda/cf-params.sample.json](./nr-reports-lambda/cf-params.sample.json)
   file to `./nr-reports-lambda/cf-params.json`

   `cp ./nr-reports-lambda/cf-params.sample.json ./nr-reports-lambda/cf-params.json`

   _Note:_ This file does not exist by default, so make sure to do this step.

3. Update the values in the file `./nr-reports-lambda/cf-params.json` as
   appropriate for your environment.
4. Run [The `deploy.sh` script](./nr-reports-lambda/scripts/deploy.sh).

   `./nr-reports-lambda/scripts/deploy.sh --package-name nr-report-builder`

   The "package-name" will be used as the stack name as well as the image name
   used to tag the image in your local Docker registry.

You should now have a Lambda function named `RunNewRelicReport` (unless you
customized it in the `cf-params.json` file). You can confirm this by looking
in the AWS Lambda console or running the following command in your terminal.

```bash
 aws lambda get-function --function-name RunNewRelicReport \
   --output table \
   --no-cli-pager \
   --color on
 ```

#### Running reports using the Lambda function

As noted in [the limitations section](#aws-lambda-limitations), currently the
AWS Lambda function does not support using a [manifest file](#manifest-file). As
such, the Lambda function can only be used to run one report at a time.
Additionally, the Lambda function only supports running template reports. In
other words, at this time, the AWS Lambda function can only be used to run
one template report at a time. That said, the Lambda function is not limited
to using a single report template. The report template to use can be specified
dynamically via the payload of the event that triggers a given invocation.

##### Specifying the Lambda template and output paths

Currently, the AWS Lambda function only supports reading templates from Amazon
S3 and writing generated report outputs back into Amazon S3. On each invocation,
the Lambda function resolves the location of the source template and the
location for the generated output using the following properties.

| Name | Description | Source | Required | Default |
| --- | --- | --- | --- | --- |
| Source Bucket Name | Name of the S3 bucket containing the template object | `templateBucket` property in the template parameters, `S3_SOURCE_BUCKET` environment variable | Y | `newrelic` |
| Source Template Key | Key for the template object within the source bucket | `templatePathKey` property in the template parameters, `S3_SOURCE_PATH_KEY` environment variable | Y | `report.html` |
| Destination Bucket Name | Name of the S3 bucket to write generated output into | `reportBucket` property in the template parameters, `S3_DEST_BUCKET` environment variable | N | `newrelic` |
| Destination Output Key | Key to use for the generated output object within the destination bucket | `reportPathKey` property in the template parameters, `S3_DEST_PATH_KEY` environment variable | N | `report.pdf` |

##### Specifying the Lambda template parameters

The AWS Lambda function looks for [template parameters](#template-parameters) in
the following locations, listed in order of precedence.

* The `TEMPLATE_PARAMS` environment variable (as a serialized JSON string)
* The `body` property of the `event` parameter passed to the handler function
* The `params` property of the `event` parameter passed to the handler function

The following properties in the template parameters have special meaning when
used in the AWS Lambda function.

| Name | Description |
| --- | --- |
| `templateBucket` | Name of the S3 bucket containing the template object |
| `templatePathKey` | Key for the template object within the source  |
| `reportBucket` | Name of the S3 bucket to write generated output into |
| `reportPathKey` | Key to use for the generated output object within the destination bucket |

#### Update the Lambda function

[The `update.sh` script](./nr-reports-lambda/scripts/deploy.sh) is used
to update the Reports Lambda function. This script first invokes
[the `build.sh` script](./nr-reports-lambda/scripts/build.sh) to build the
Lambda Docker image using [the Lambda Dockerfile](./nr-reports-lambda/Dockerfile).
The script will then push the image from the local Docker registry to the
registry defined in the `./nr-reports-lambda/cf-params.json` file and use the
`aws lambda update-function-code` command to update the Lambda to point to the
new image. Note that you _must_ increment the value of the `ImageTag` parameter
specified in your `./nr-reports-lambda/cf-params.json` file.

At this time, updating the Lambda function is of little use unless you make
changes to the actual Reports code. This script will be useful once the Lambda
function supports [manifest files](#manifest-file) and bundled template files.

#### Deleting the Lambda function

[The `delete.sh` script](./nr-reports-lambda/scripts/delete.sh) is used
to delete the Reports Lambda function and the associated CloudFormation stack.

## Troubleshooting

### `Error: Failed to launch the browser process!`

If you get the error below while running the Docker CLI or CRON image, you
need to ensure that the container has privileged access. Granting the container
privileged access can vary depending on where the container is being run. For
example, on ECS, the container must have the privileged container capability,
i.e. `com.amazonaws.ecs.capability.privileged-container`. When running locally,
you may need to add `--cap-add=SYS_ADMIN`. See
[this documentation](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)
for more details.

```bash
Error: Failed to launch the browser process!
Failed to move to new namespace: PID namespaces supported, Network namespace supported, but failed: errno = Operation not permitted
[0311/215738.145277:FATAL:zygote_host_impl_linux.cc(191)] Check failed: ReceiveFixedMessage(fds[0], kZygoteBootMessage, sizeof(kZygoteBootMessage), &boot_pid).
Received signal 6
  r8: 00007ffe9021d000  r9: 00007fc18b8aefdc r10: 0000000000000008 r11: 0000000000000246
 r12: 00007ffe9021d650 r13: 00007ffe9021d56c r14: 00007fc189afbe20 r15: 00000000000000a0
  di: 0000000000000002  si: 00007ffe9021ce90  bp: 00007ffe9021ce90  bx: 0000000000000000
  dx: 0000000000000000  ax: 0000000000000000  cx: 00007fc18e3ef3f2  sp: 00007ffe9021ce88
  ip: 00007fc18e3ef3f2 efl: 0000000000000246 cgf: 002b000000000033 erf: 0000000000000000
 trp: 0000000000000000 msk: 0000000000000000 cr2: 0000000000000000
[end of stack trace]


TROUBLESHOOTING: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md

    at onClose (/app/nr-storybook-cli/node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserRunner.js:229:20)
    at ChildProcess.<anonymous> (/app/nr-storybook-cli/node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserRunner.js:220:79)
    at ChildProcess.emit (events.js:412:35)
    at ChildProcess.emit (domain.js:475:12)
    at Process.ChildProcess._handle.onexit (internal/child_process.js:282:12)
```

## Support

New Relic has open-sourced this project. This project is provided AS-IS WITHOUT
WARRANTY OR DEDICATED SUPPORT. Issues and contributions should be reported to
the project here on GitHub.

We encourage you to bring your experiences and questions to the
[Explorers Hub](https://discuss.newrelic.com) where our community members
collaborate on solutions and new ideas.

## Contributing

We encourage your contributions to improve Reports! Keep in mind when you
submit your pull request, you'll need to sign the CLA via the click-through
using CLA-Assistant. You only have to sign the CLA one time per project. If you
have any questions, or to execute our corporate CLA, required if your
contribution is on behalf of a company, please drop us an email at
opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed
to the privacy and security of our customers and their data. We believe that
providing coordinated disclosure by security researchers and engaging with the
security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any
of New Relic's products or websites, we welcome and greatly appreciate you
reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

## License

New Relic Reports is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt)
License.

New Relic Reports also uses source code from third-party libraries. You can
find full details on which libraries are used and the terms under which they
are licensed in the third-party notices document.
