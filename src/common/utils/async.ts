// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPromiseLike<T>(v: any): v is PromiseLike<T> {
    return typeof v?.then === 'function';
}
