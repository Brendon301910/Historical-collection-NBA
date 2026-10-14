import { Entity, EntityProps } from './shared/entity-base.entity';

export interface PlayerProps {
  name: string;
  height: string;
  yearOfBirth: number;
}

export class Player extends Entity<PlayerProps> {
  constructor(props: PlayerProps & EntityProps, id?: string) {
    super(props, id);
  }

  public getId() {
    return this._id;
  }

  public get name(): string {
    return this.props.name;
  }
  public set name(name: string) {
    this.props.name = name;
  }

  public get height(): string {
    return this.props.height;
  }

  public set height(height: string) {
    this.props.height = height;
  }

  public get yearOfBirth(): number {
    return this.props.yearOfBirth;
  }

  public set yearOfBirth(yearOfBirth: number) {
    this.props.yearOfBirth = yearOfBirth;
  }
}
