const patterns = [
  {
    name: 'operator',
    regex: /=|>|<|>=|<=|=<|=>|!=/g,
  },
  {
    name: 'numeric',
    regex: /\b(\d+)\b/g,
  },
  {
    name: 'string',
    regex: /('([^']|'')*')/g,
  },
  {
    name: 'keyword',
    regex:
      /\b(?:SELECT|FROM|SHOW EVENT TYPES|WHERE|AS|FACET|FACET CASES|LIMIT|SINCE|UNTIL|WITH TIMEZONE|COMPARE WITH|TIMESERIES|EXTRAPOLATE|AUTO|MAX|IN|ORDER BY|LIMIT|OFFSET|WITH|SLIDE BY|WITH METRIC_FORMAT)\b/gi,
  },
  {
    name: 'function',
    regex:
      /(apdex|average|buckets|count|eventType|filter|funnel|histogram|keyset|latest|max|median|min|percentage|percentile|rate|stddev|sum|uniqueCount|uniques|aggregationendtime|bucketPercentile|cardinality|dateOf|derivative|dimensions|include|exclude|latestrate|minuteOf|mod|montnOf|quarterOf|predictLinear|round|stdvar|weekOf|yearOf|accountId|aparse|concat|earliest|eventType|getField|if|length|lower|position|string|substring|upper|abs|clamp_max|clamp_min|exp|pow|sqrt)(?=\()/gi,
  },
];

export default patterns;
