export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>;
}
