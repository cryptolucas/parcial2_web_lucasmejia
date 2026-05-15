import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // <-- Verifica esta ruta
import { Item } from '../../items/entities/item.entity'; // <-- Verifica esta ruta

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  LOST = 'lost',
}

@Entity({ name: 'loans' })
@Index(['itemId', 'status']) // Índice para verificar disponibilidad
@Index(['userId', 'status']) // Índice para contar préstamos activos por usuario
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  // FK -> User(id), ON DELETE RESTRICT
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  itemId!: string;

  // FK -> Item(id), ON DELETE RESTRICT
  @ManyToOne(() => Item, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'itemId' })
  item!: Item;

  @Column({ type: 'timestamptz' })
  loanedAt!: Date;

  @Column({ type: 'timestamptz' })
  dueAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  returnedAt!: Date | null;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status!: LoanStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  fineAmount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}