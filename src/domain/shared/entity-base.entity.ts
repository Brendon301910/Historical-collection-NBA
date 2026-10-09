import { randomUUID } from 'crypto';

export interface EntityProps {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Entity<Props> {
  protected _id: string;
  protected props: Props & EntityProps & { createdAt: Date };

  constructor(props: Props & EntityProps, id?: string) {
    this._id = id ?? randomUUID();
    this.props = { ...props, createdAt: props.createdAt ?? new Date() };
  }

  public get id() {
    return this._id;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  public update() {
    this.props.updatedAt = new Date();
  }

  public get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
}
