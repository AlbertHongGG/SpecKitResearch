type CounterName =
  | 'publish_success'
  | 'publish_validation_error'
  | 'submit_validation_error'
  | 'submit_success'
  | 'results_request'
  | 'export_page_served'
  | 'export_request'
  | 'results_served';

const counters: Record<CounterName, number> = {
  publish_success: 0,
  publish_validation_error: 0,
  submit_validation_error: 0,
  submit_success: 0,
  results_request: 0,
  export_page_served: 0,
  export_request: 0,
  results_served: 0,
};

export function incCounter(name: CounterName, by = 1) {
  counters[name] = (counters[name] ?? 0) + by;
}

export function snapshotCounters() {
  return { ...counters };
}
