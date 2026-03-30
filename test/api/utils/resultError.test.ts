import { ResultError } from '@api/domain/errors/ResultError';

describe('ResultError', () => {
  describe('create', () => {
    it('creates an error with code and message', () => {
      const err = ResultError.create('NOT_FOUND', 'Missing resource');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Missing resource');
      expect(err.metadata).toBeUndefined();
    });

    it('creates an error with metadata', () => {
      const err = ResultError.create('VALIDATION', 'Bad input', { field: 'email' });
      expect(err.metadata).toEqual({ field: 'email' });
    });
  });

  describe('formatMessage', () => {
    it('replaces a single placeholder', () => {
      const err = ResultError.create('X', 'Hello {name}');
      expect(err.formatMessage({ name: 'Ada' })).toBe('Hello Ada');
    });

    it('replaces multiple placeholders', () => {
      const err = ResultError.create('X', '{greeting}, {who}!');
      expect(err.formatMessage({ greeting: 'Hi', who: 'you' })).toBe('Hi, you!');
    });

    it('coerces number values to string', () => {
      const err = ResultError.create('X', 'Count is {n}');
      expect(err.formatMessage({ n: 42 })).toBe('Count is 42');
    });

    it('leaves unknown tokens unchanged when key is missing from values', () => {
      const err = ResultError.create('X', 'Hello {name}');
      expect(err.formatMessage({})).toBe('Hello {name}');
    });

    it('ignores extra keys in values', () => {
      const err = ResultError.create('X', 'Only {a}');
      expect(err.formatMessage({ a: 'one', b: 'two' })).toBe('Only one');
    });

    it('handles repeated placeholder key', () => {
      const err = ResultError.create('X', '{x} and {x}');
      expect(err.formatMessage({ x: 'same' })).toBe('same and same');
    });
  });

  describe('withMetadata', () => {
    it('adds metadata when none existed', () => {
      const err = ResultError.create('E', 'msg');
      const next = err.withMetadata({ reason: 'timeout' });
      expect(next).not.toBe(err);
      expect(next.metadata).toEqual({ reason: 'timeout' });
      expect(err.metadata).toBeUndefined();
    });

    it('shallow-merges with existing metadata', () => {
      const err = ResultError.create('E', 'msg', { a: 1, shared: 'old' });
      const next = err.withMetadata({ b: 2, shared: 'new' });
      expect(next.metadata).toEqual({ a: 1, shared: 'new', b: 2 });
    });
  });

  describe('toPrimitives', () => {
    it('serializes code and message only when metadata is absent', () => {
      const err = ResultError.create('C', 'M');
      expect(err.toPrimitives()).toEqual({ code: 'C', message: 'M' });
    });

    it('includes metadata when present', () => {
      const err = ResultError.create('C', 'M', { id: '99' });
      expect(err.toPrimitives()).toEqual({
        code: 'C',
        message: 'M',
        metadata: { id: '99' },
      });
    });
  });
});
