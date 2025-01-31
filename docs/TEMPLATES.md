# Template Reports

**NOTE:** As of v3.0.0, template reports have been **_deprecated_** due to the
potential security issues involved with running user defined templates. No
replacement for this functionality is planned. The documentation for building
and running template reports is provided below .

Template reports provide a mechanism for building custom reports using
[templates](#templates). Templates are text-based, user-defined documents that
can contain both content and logic. Templates are processed when a template
report is run to produce text-based output. Special bits of logic called
[extensions](#template-extensions) are provided that make it easy to use New
Relic data in template reports. By default, the output is rendered in a browser
to produce PDF output, but it is just as easy to disable rendering and deliver
the template output in a variety of ways.

Template reports are created from [templates](#templates). Templates are stored
in template files. Template files are text files that contain text mixed
with template "instructions". Template "instructions" are written using a
special syntax that is understood by the [the Nunjucks template "engine"](https://mozilla.github.io/nunjucks/).
Reports are produced from a template file by passing the content of the file
through the template engine. The template engine evaluates the "instructions" to
transform the original content into the raw report output. By default, the raw
output is rendered using a headless Chrome instance and saved as a PDF. But you
can also tell the New Relic Reports engine not to do so. You might do this if
you are producing a CSV file or you want to deliver raw HTML instead of rendered
HTML.

The following JSON shows an example of a template report definition in a
[manifest file](#manifest-file). You might recognize this from the
section [Update the example manifest file](#update-the-example-manifest-file)
in the [Getting Started](#getting-started) tutorial.

```json
  {
    "name": "hello-world",
    "templateName": "hello-world.html",
    "parameters": {
      "accountId": 1234567,
      "appName": "Shop Service"
    },
    "channels": []
  }
```

When the reporting engine runs this report, it will invoke the templating
engine with the template name `hello-world.html` and the parameters `accountId`
set to `1234567` and `appName` set to `Shop Service`. The template output will
be rendered to a PDF file named `hello-world.pdf` using a headless Chrome
instance and this file will be copied to the current working directory since the
default channel is the [`file`](#file-channel) channel and no `destDir`
channel parameter is set.

See the section [Template Report Properties](#template-report-properties) for
more information on the available dashboard report properties.

![User-Defined Template Warning](https://img.shields.io/badge/User_Defined_Template_Warning-Never_run_untrusted_templates!-critical?style=for-the-badge&labelColor=orange)

Nunjucks does not sandbox execution so **it is not safe to run untrusted
templates or inject user-defined content into template definitions**. Doing so
can expose attack vectors for accessing sensitive data and remote code
execution.

See [this issue](https://github.com/mozilla/nunjucks-docs/issues/17)
for more information.

## Getting Started

First, make sure you have completed the [Before you begin](../README.md#before-you-begin)
tasks.

### Copy the example template

Next, make a copy of the example `hello-world.html` template in the `include`
directory.

```bash
cp ./examples/hello-world.html ./include/hello-world.html
```

### Update the example template

Next, edit the new template and replace the string `Shop Service` with an
appropriate APM service name and the account ID `1234567` with the account ID
for the service. Then save the template.

Don't worry for now what all the rest of the content in the file means. It looks
more complicated than it is and will be explained [in the usage section](#usage).

### Run the template report

Now run the report using the following command.

```bash
./nr-reports-cli/bin/nr-reports.sh -n hello-world.html
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

First, load `hello-world.html` back into an editor. Now replace the name
of your application with the string `{{ appName }}` (curly braces and all) and
completely _remove_ the `accountId` parameter (and the `,` after
`type="AREA"`). Also, change the `type` from `AREA` to `LINE` just so we are
sure we are really running a new example.

The `chart` tag should now look something like the following.

```html
<div>
    {% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = '{{ appName }}' SINCE last week UNTIL this week TIMESERIES",
        type="AREA"
    %}{% endchart %}
</div>
```

### Create a template parameter values file

Now we will create a [values file](#values-file). The values file is a
[JSON](https://www.json.org/json-en.html) or [YAML](https://yaml.org/) file
with a flat structure that is a set of key/value pairs. It let's us separate out
specific values from the template so that we can use the same template with
different values without having to change the template.

Copy the example values file to a new file named `hello-world.json`.

```bash
cp ./examples/values.json ./include/hello-world.json
```

### Update the example values file

Next, edit the new file and replace the string `Shop Service` and the account
ID `1234567` with the values you removed from the template in the previous step.
Then save the file.

### Re-run the template report

First, delete the previous report so we can be sure this run re-creates a new
one.

```bash
rm ./hello-world.pdf
```

Now, run the report using the following command, noting the addition of the `-v`
option that is used to specify the path to the values file.

```bash
./nr-reports-cli/bin/nr-reports.sh -n hello-world.html -v include/hello-world.json
```

Now there should be a new PDF file in the current directory called
`hello-world.pdf`. Open it up and it should look exactly the same as before.
That is because all we've done above is separate out the account ID and
application name so it isn't hardcoded in the template. We didn't actually
change the values.

## Templates

Here is a very basic template.

```text
{% for fruit in ['banana', 'orange'] -%}
I want a {{ fruit }}.
{% endfor -%}
```

This template contains three instructions.

1. The text in between the first `{%` and `%}` pair is an example of a
   [tag](http://mozilla.github.io/nunjucks/templating.html#tags). In particular,
   this is the opening of the [for tag](http://mozilla.github.io/nunjucks/templating.html#for).
1. The text `{{ fruit }}` is an example of a [variable lookup](http://mozilla.github.io/nunjucks/templating.html#variables).
1. The text in between the second `{%` and `%}` pair signals the closing of the
   `for` tag.

The `for` tag defines a loop. Any content (including other instructions) in
between the text `for` and the text `endfor` will be evaluated for each item
of the loop. In this case, the loop will be executed twice. Once for each value
of the list specified by the expression `['banana', 'orange']`. Because the
string `I want a {{ fruit }}.` is placed in between the opening and closing of
the `for` tag, the following output will be produced when this template is
passed through the Nunjucks template engine.

```text
I want a banana.
I want a orange.

```

Notice that the final output does _not_ include any Nunjucks "instructions". All
instructions have been replaced with the content produced as a result of
evaluating each instruction.

See the section [Templating](http://mozilla.github.io/nunjucks/templating.html)
of the Nunjucks documentation for detailed information on how to build
templates.

## Template Content

Template reports are built out of text. The template engine does not care about
the semantics of the text that it processes. In other words, the template engine
does not care if the text represents CSV data or HTML data. Just that it is
text.

There is one special case which applies to the default behavior of the reporting
engine. In this case, the output of the template engine will be loaded into a
headless Chrome instance and the rendered page will be saved as a PDF file.
While just about any text-based document can be rendered by Chrome in one way or
another, the reporting engine applies special handling if, and only if, the
[`isMarkdown` flag](#template-report-properties) is present and set to `true` in
the report definition or if the template name has a `.md` extension.

In either of these conditions are met, the reporting engine assumes that the
template contains [GitHub Flavored Markdown](https://github.github.com/gfm/).
This will result in _two_ passes through the template engine. The first pass is
the standard pass the templating engine makes over any template. The additional
_second_ pass renders the [`report.md.html`](./templates//base/report.md.html)
template and inserts the output from the first pass into the `content` section
after converting the output to HTML using
[the showdown Markdown converter](https://github.com/showdownjs/showdown).

### HTML Template Example

Following is an example of an HTML template. You might recognize this from the
section [Update the example template](#update-the-example-template) in the
[Getting Started](#getting-started) tutorial.

```html
{% extends "base/report.html" %}

{% block content %}
<h1>My Application Throughput</h1>
<p>
    This is our application throughput for last week.
</p>
<div>
    {% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
        type="AREA",
        accountId=1234567
    %}{% endchart %}
</div>
{% endblock %}
```

### Markdown Template Example

Following is an example of a Markdown template that will produce something very
similar to the example HTML template above.

```markdown
# My Application Throughput

This is our application throughput for last week.

{% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
   type="AREA",
   accountId=1234567
%}{% endchart %}
```

### CSV Template Example

As mentioned, template reports can be built from any text-based content and
produce any text-based output. A report could produce CSV, XML, or JSON output.
For example, following is a template that produces a CSV file from the result of
running a NRQL query using [the `nrql` tag](#the-nrql-tag).

```nunjucks
App Name,Duration
{%- nrql "SELECT average(duration) AS 'duration' FROM Transaction FACET appName",
  accountId=1234567
-%}
   {%- for item in result %}
{{ item.facet[0] }},{{ item.duration }}
   {%- endfor -%}
{%- endnrql -%}
```

In the above case, the output from the template engine is probably not meant to
be rendered in a browser. The `render` report parameter is provided to allow you
to inform the reporting engine to skip the rendering step. In some cases, this
may even be desirable for HTML-based templates. For example, if the output is
meant to be included inline in an email or sent as a Slack message.

## Template Resolution

When processing a template, the template engine uses
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
the directories `include` and `templates` relative to the current working
directory. In addition, the `TEMPLATE_PATH` environment variable may be set to
a list of additional directories separated by the system path separator. These
directories will also be added to the template path. Finally, the `templatePath`
[engine option](#engine-options), may also be used to specify additional
directories separated by the system path separator.

When building _any_ of the docker images, all templates (and all other files)
in the [`include`](./include) directory are copied into the `include` directory
of the image (`/app/nr-reports-cli/include`). Note that files in the `include`
directory are `git` ignored. To include files in this directory in `git`, either
remove the line `include/*` from the [`gitignore`](./gitignore) file or add
negation patterns for the files to be committed.

## Template Extensions

New Relic Reports provides several [custom tags](http://mozilla.github.io/nunjucks/api.html#custom-tags)
that make it easy to integrate New Relic charts and data in your reports.

### The `chart` Tag

The `chart` tag is used to include a [New Relic chart](https://docs.newrelic.com/docs/query-your-data/explore-query-data/use-charts/use-your-charts/)
in a report. It should only be used with HTML or markdown based templates that
will be rendered in Chrome to produce a PDF. For an HTML based template, the
`chart` tag will inject an HTML `<img />` tag into the generated output. For a
markdown based template, the `chart` tag will inject
[the markdown to create an image](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#images)
into the generated output.

For example, recall [the snippet from the example template](#update-the-example-template)
in the [Getting Started](#getting-started) tutorial.

```nunjucks
{% chart "FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
   type="AREA",
   accountId=1234567
%}{% endchart %}
```

When the template engine evaluates this tag, it will invoke [the `chart`
extension](./nr-reports-core/lib/extensions/chart-extension.js). The `chart`
extension retrieves a static chart URL for the given account ID, NRQL, and chart
options using the following GraphQL query.

```graphql
{
   actor {
      account(id: $accountId) {
         nrql(query: $query, timeout: $timeout) {
            staticChartUrl(chartType: $chartType, format: $chartFormat, width: $chartWidth, height: $chartHeigh)
         }
      }
   }
}
```

The `chart` extension takes the returned URL and injects the appropriate markup
to display the chart image in the report.

Unless the template contains markdown, the `chart` tag is replaced with an
HTML `img` tag with the `src` value set to the static chart URL, like the one
below.

```html
<img src="STATIC_CHART_URL" ... />
```

For markdown, the `chart` tag is replaced with the markdown to show an image,
like below.

```markdown
![](STATIC_CHART_URL)
```

#### `chart` Tag Options

The `chart` tag supports the following options.

| Option Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| accountId | An account ID to run the query with | Y | |
| query or first argument | The NRQL query to run | string | Y | |
| type | The chart type. A valid value for the `chartType` argument of the `staticChartUrl` field of the `NrdbResultContainer` GraphQL type, e.g. `AREA`, `LINE`, etc. | string | N | LINE |
| format | The chart format. A valid value for the `format` argument of the `staticChartUrl` field of the `NrdbResultContainer` GraphQL type, e.g. `PNG` or `PDF`. | string | N | PNG |
| width | The width of the image | number | N | 640 |
| height | The height of the image | number | N | 480 |
| class | CSS class name(s) to add to the HTML `img` tag. Unused for markdown templates. | string | N | '' |

**NOTE:** The NRQL query can either be specified as the first argument after the
opening of the `chart` tag as shown in the example above or using the `query`
keyword argument as shown below.

```nunjucks
{% chart
   accountId=1234567,
   query="FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
   type="AREA"
%}{% endchart %}
```

### The `nrql` Tag

The `nrql` tag is used to run a NRQL query. The results of the query are stored
in a template variable for further processing by your templates. We saw
[an example of this in the Template Content section](#template-content) section.
It is repeated below for convenience.

```nunjucks
App Name,Duration
{%- nrql "SELECT average(duration) AS 'duration' FROM Transaction FACET appName",
  accountId=1234567
-%}
   {%- for item in result %}
{{ item.facet[0] }},{{ item.duration }}
   {%- endfor -%}
{%- endnrql -%}

```

When the template engine evaluates the `nrql` tag, it will invoke [the `nrql`
extension](./nr-reports-core/lib/extensions/nrql-extension.js). The `nrql`
extension runs the given NRQL query using the given account ID(s) using the
following GraphQL query.

```graphql
{
   actor {
      nrql(accounts: $accountIds, query: $query, timeout: $timeout) {
         results
         metadata {
            facets
            eventTypes
         }
      }
   }
}
```

The extension stores an object containing the `results` and `metadata` fields
into the variable with the name specified by the `var` option on the `nrql`
tag or into a variable named `result`. The `results` field is an array of
objects whose structure matches the query submitted. The `facets` field is an
array containing the names of the facets in the query submitted and the
`eventTypes` field is an array of the names of the event types in the query
submitted. Following is an example JSON object that would be returned as the
result of running the query
`SELECT average(cpuPercent) FROM SystemSample FACET hostname`.

```json
{
   "metadata": {
      "eventTypes": [
         "SystemSample"
      ],
      "facets": [
         "hostname"
      ]
   },
   "results": [
      {
         "facet": "my.local.test",
         "average.cpuPercent": 1.5432042784889708,
         "hostname": "my.local.test"
      }
   ]
}
```

For more information on the structure of these fields, see the type definition
for the `CrossResultsNrdbResultContainer` type at `https://api.newrelic.com/graphiql`.

#### `nrql` Tag Options

The `nrql` tag supports the following options.

| Option Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| accountId | Account ID to run the query with. Multiple account IDs an be specified separated by commas. One of the this option or the `accountIds` option must be specified. | Y | |
| accountIds | A list of account IDs to run the query with. A maximum of 5 account IDs is allowed. One of the this option or the `accountId` option must be specified. | array | Y | |
| query or first argument | The NRQL query to run. This option supports [template parameter](#template-parameters) interpolation. That is, the query string is interpolated using the template engine prior to being run. | string | Y | |
| var | The name of the variable to hold the query result | string | N | result |

**NOTE:** The NRQL query can either be specified as the first argument after the
opening of the `chart` tag as shown in the example above or using the `query`
keyword argument as shown below.

```nunjucks
{% nrql
   accountId=1234567,
   query="FROM Transaction SELECT rate(count(*), 1 minute) as 'Requests Per Minute' where appName = 'Shop Service' SINCE last week UNTIL this week TIMESERIES",
%}
<h2>{{ result.facet[0] }}<h2>
{% endnrql %}
```

## Template Parameters

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

### Specifying template parameters

Template parameters are specified as a [JSON](https://www.json.org/json-en.html)
or [YAML](https://yaml.org/) object. For example, the following JSON specifies
3 template parameters: 1 string, 1 number, and 1 array of strings.

```json
{
   "accountId": 123456,
   "title": "New Relic Weekly Report",
   "appNames": [ "app1", "app2" ],
}
```

When processing a template, the reporting engine makes all properties in the
[report execution context](#report-execution-context) available as template
parameters.

## Values File

A values file is a [JSON](https://www.json.org/json-en.html) or
[YAML](https://yaml.org/) file containing [template parameters](#template-parameters)
to use when processing a template report. Values files are only used when a
manifest file is not specified. If both a values file and manifest file are
specified, the values file is ignored.

## Template Report Output

By default, the template report generator produces PDF files by rendering the
generated template content from the template engine using an embedded headless
Chrome browser. However, if the `render` option is set to `false` in the
[report definition](#report-definitions), a renderer is passed to the [channel](#channels)
implementations that can return the generated template content directly or can
pass the template content to a secondary template specified in the
`fileTemplateName` option in the [report execution context](#report-execution-context).

## Template Report Properties

| Property Name | Description | Type | Required | Default |
| --- | --- | --- | --- | --- |
| templateName | The template _name_. Must be available on the [template path](#template-resolution) | string | Y | |
| parameters | The [template parameters](#template-parameters) to use for this report | object | N | `{}` |
| isMarkdown | `true` if the template is written in Markdown, `false` if the template is any other content type, or omit for "auto" detection by file extension of the template name | boolean | N | undefined (auto detect) |
| render | `true` if the report output should be rendered using headless chrome, otherwise `false` | boolean | true |
