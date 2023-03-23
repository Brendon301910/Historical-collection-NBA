import { randomUUID } from "crypto";

export interface EntityProps {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Entity<Props> {
  protected _id: string;
  protected props: Props & EntityProps;

  constructor(props: Props & EntityProps, id?: string) {
    this._id = id ?? randomUUID();
    this.props = props;
  }

  public get id() {
    return this._id;
  }

  public get createdAt(): Date {
    return this.createdAt;
  }

  public get updatedAt(): Date {
    return this.updatedAt;
  }

  public update() {
    this.props.updatedAt = new Date();
  }

  public get deletedAt(): Date {
    return this.deletedAt;
  }
}
