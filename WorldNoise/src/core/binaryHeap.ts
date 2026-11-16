export class MinHeap {
  private keys: number[] = [];
  private values: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, value: number): void {
    let index = this.keys.length;
    this.keys.push(key);
    this.values.push(value);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.keys[index] = this.keys[parent];
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.keys[index] = key;
    this.values[index] = value;
  }

  pop(): number {
    const top = this.values[0];
    const lastKey = this.keys.pop() as number;
    const lastValue = this.values.pop() as number;
    const size = this.keys.length;
    if (size > 0) {
      let index = 0;
      for (;;) {
        const left = 2 * index + 1;
        if (left >= size) break;
        const right = left + 1;
        const child = right < size && this.keys[right] < this.keys[left] ? right : left;
        if (this.keys[child] >= lastKey) break;
        this.keys[index] = this.keys[child];
        this.values[index] = this.values[child];
        index = child;
      }
      this.keys[index] = lastKey;
      this.values[index] = lastValue;
    }
    return top;
  }
}
