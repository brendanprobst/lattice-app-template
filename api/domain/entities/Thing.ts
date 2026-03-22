/**
 * Thing — example domain entity for the template (CRUD vertical slice).
 */
export class Thing {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly createdAt: Date
  ) {}

  updateName(name: string): void {
    this.name = name.trim();
  }

  toPrimitives(): { id: string; name: string; createdAt: string } {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
