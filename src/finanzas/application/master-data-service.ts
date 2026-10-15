import type { AuditRecorder } from '../domain/audit';
import type { Authorizer } from './permission-service';
import { validateAccount, type Account } from '../domain/accounts';
import {
  validateCategory,
  validateResultLine,
  validateSubcategory,
  type Category,
  type ResultLine,
  type Subcategory,
} from '../domain/categories';
import { domainError } from '../domain/errors';
import { validateLedgerAccount, type LedgerAccount } from '../domain/ledger-accounts';
import {
  findDuplicateCandidates,
  type AccountKind,
  type AccountOwnership,
  type CategoryNature,
  type LedgerAccountNature,
  type MasterDuplicate,
  type MasterEntityType,
  type PersonKind,
  type ResultLineNature,
} from '../domain/masters';
import { validatePerson, type Person } from '../domain/persons';
import type { CommandContext, Currency, Result } from '../domain/types';

export type CreatePersonCommand = {
  entityType: 'PERSON';
  displayName: string;
  kind: PersonKind;
  taxId?: string;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateCategoryCommand = {
  entityType: 'CATEGORY';
  code: string;
  name: string;
  nature: CategoryNature;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateSubcategoryCommand = {
  entityType: 'SUBCATEGORY';
  code: string;
  name: string;
  categoryId: string;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateResultLineCommand = {
  entityType: 'RESULT_LINE';
  code: string;
  name: string;
  nature: ResultLineNature;
  order: number;
  ledgerAccountId: string;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateLedgerAccountCommand = {
  entityType: 'LEDGER_ACCOUNT';
  code: string;
  name: string;
  nature: LedgerAccountNature;
  parentId?: string;
  isPostable: boolean;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateAccountCommand = {
  entityType: 'ACCOUNT';
  name: string;
  kind: AccountKind;
  ownership: AccountOwnership;
  financialInstitution?: string;
  currency: Currency;
  ledgerAccountId: string;
  isAvailable: boolean;
  isReconcilable: boolean;
  validFrom: string;
  confirmPossibleDuplicate?: boolean;
};

export type CreateMasterCommand =
  | CreatePersonCommand
  | CreateCategoryCommand
  | CreateSubcategoryCommand
  | CreateResultLineCommand
  | CreateLedgerAccountCommand
  | CreateAccountCommand;

export type Master = Person | Category | Subcategory | ResultLine | LedgerAccount | Account;

export type MasterRepository = {
  findByCode(entityType: MasterEntityType, code: string): Promise<Master | null>;
  findById(entityType: MasterEntityType, id: string): Promise<Master | null>;
  findAll(entityType: MasterEntityType): Promise<Master[]>;
  save(master: Master): Promise<Master>;
};

export type MasterDataServiceDependencies = {
  masters: MasterRepository;
  createId: () => string;
  authorize: Authorizer;
  audit: AuditRecorder;
};

function nameOf(value: CreateMasterCommand | Master): string {
  switch (value.entityType) {
    case 'PERSON':
      return value.displayName;
    case 'CATEGORY':
    case 'SUBCATEGORY':
    case 'RESULT_LINE':
    case 'LEDGER_ACCOUNT':
    case 'ACCOUNT':
      return value.name;
  }
}

function codeOf(value: Master): string | null {
  switch (value.entityType) {
    case 'PERSON':
    case 'ACCOUNT':
      return null;
    case 'CATEGORY':
    case 'SUBCATEGORY':
    case 'RESULT_LINE':
    case 'LEDGER_ACCOUNT':
      return value.code;
  }
}

function validateMasterCommand(command: CreateMasterCommand): Result<void> {
  if (command.validFrom.trim().length === 0) {
    return {
      ok: false,
      error: domainError('MISSING_REQUIRED_FIELD', 'La fecha de vigencia es obligatoria.', true, {
        field: 'validFrom',
      }),
    };
  }

  switch (command.entityType) {
    case 'PERSON': {
      const result = validatePerson({ displayName: command.displayName, kind: command.kind });
      return result.ok ? { ok: true, value: undefined } : result;
    }
    case 'CATEGORY': {
      const result = validateCategory({ code: command.code, name: command.name, nature: command.nature });
      return result.ok ? { ok: true, value: undefined } : result;
    }
    case 'SUBCATEGORY': {
      const result = validateSubcategory({ code: command.code, name: command.name, categoryId: command.categoryId });
      return result.ok ? { ok: true, value: undefined } : result;
    }
    case 'RESULT_LINE': {
      const result = validateResultLine({
        code: command.code,
        name: command.name,
        nature: command.nature,
        order: command.order,
        ledgerAccountId: command.ledgerAccountId,
      });
      return result.ok ? { ok: true, value: undefined } : result;
    }
    case 'LEDGER_ACCOUNT': {
      const result = validateLedgerAccount({
        code: command.code,
        name: command.name,
        nature: command.nature,
        isPostable: command.isPostable,
      });
      return result.ok ? { ok: true, value: undefined } : result;
    }
    case 'ACCOUNT': {
      const result = validateAccount({
        name: command.name,
        kind: command.kind,
        ownership: command.ownership,
        currency: command.currency,
        ledgerAccountId: command.ledgerAccountId,
        isAvailable: command.isAvailable,
      });
      return result.ok ? { ok: true, value: undefined } : result;
    }
  }
}

function buildMaster(ctx: CommandContext, command: CreateMasterCommand, id: string): Master {
  const base = {
    id,
    validFrom: command.validFrom.trim(),
    validTo: null,
    createdAt: ctx.now,
    createdBy: ctx.actorUserId,
  };

  switch (command.entityType) {
    case 'PERSON':
      return {
        ...base,
        entityType: 'PERSON',
        displayName: command.displayName.trim(),
        kind: command.kind,
        taxId: command.taxId ?? null,
      };
    case 'CATEGORY':
      return {
        ...base,
        entityType: 'CATEGORY',
        code: command.code.trim(),
        name: command.name.trim(),
        nature: command.nature,
      };
    case 'SUBCATEGORY':
      return {
        ...base,
        entityType: 'SUBCATEGORY',
        code: command.code.trim(),
        name: command.name.trim(),
        categoryId: command.categoryId,
      };
    case 'RESULT_LINE':
      return {
        ...base,
        entityType: 'RESULT_LINE',
        code: command.code.trim(),
        name: command.name.trim(),
        nature: command.nature,
        order: command.order,
        ledgerAccountId: command.ledgerAccountId.trim(),
      };
    case 'LEDGER_ACCOUNT':
      return {
        ...base,
        entityType: 'LEDGER_ACCOUNT',
        code: command.code.trim(),
        name: command.name.trim(),
        nature: command.nature,
        parentId: command.parentId ?? null,
        isPostable: command.isPostable,
      };
    case 'ACCOUNT':
      return {
        ...base,
        entityType: 'ACCOUNT',
        name: command.name.trim(),
        kind: command.kind,
        ownership: command.ownership,
        financialInstitution: command.financialInstitution ?? null,
        currency: command.currency,
        ledgerAccountId: command.ledgerAccountId,
        isAvailable: command.isAvailable,
        isReconcilable: command.isReconcilable,
      };
  }
}

export class MasterDataService {
  constructor(private readonly dependencies: MasterDataServiceDependencies) {}

  async searchDuplicates(candidate: CreateMasterCommand): Promise<MasterDuplicate[]> {
    const existing = await this.dependencies.masters.findAll(candidate.entityType);

    const matches = findDuplicateCandidates(
      nameOf(candidate),
      candidate.entityType === 'PERSON' ? candidate.taxId ?? null : null,
      existing.map(item => ({
        id: item.id,
        code: codeOf(item),
        name: nameOf(item),
        taxId: item.entityType === 'PERSON' ? item.taxId : null,
      }))
    );

    return matches.map(match => ({ entityType: candidate.entityType, ...match }));
  }

  async createMaster(ctx: CommandContext, command: CreateMasterCommand): Promise<Result<Master>> {
    const authorized = await this.dependencies.authorize(ctx, 'CREATE_MASTER');
    if (!authorized.ok) return authorized;

    const validated = validateMasterCommand(command);
    if (!validated.ok) return validated;

    if ('code' in command) {
      const existingByCode = await this.dependencies.masters.findByCode(command.entityType, command.code);
      if (existingByCode) {
        return {
          ok: false,
          error: domainError('MASTER_CODE_EXISTS', 'Ya existe un maestro con ese codigo.', true, {
            entityType: command.entityType,
            code: command.code,
            existingId: existingByCode.id,
          }),
        };
      }
    }

    if (command.entityType === 'SUBCATEGORY') {
      const category = await this.dependencies.masters.findById('CATEGORY', command.categoryId);
      if (!category) {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La categoria referenciada no existe.', true, {
            entityType: 'CATEGORY',
            id: command.categoryId,
          }),
        };
      }
    }

    if (command.entityType === 'LEDGER_ACCOUNT' && command.parentId) {
      const parent = await this.dependencies.masters.findById('LEDGER_ACCOUNT', command.parentId);
      if (!parent) {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La cuenta contable padre no existe.', true, {
            entityType: 'LEDGER_ACCOUNT',
            id: command.parentId,
          }),
        };
      }
    }

    if (command.entityType === 'ACCOUNT') {
      const ledgerAccount = await this.dependencies.masters.findById('LEDGER_ACCOUNT', command.ledgerAccountId);
      if (!ledgerAccount) {
        return {
          ok: false,
          error: domainError('MASTER_NOT_FOUND', 'La cuenta contable referenciada no existe.', true, {
            entityType: 'LEDGER_ACCOUNT',
            id: command.ledgerAccountId,
          }),
        };
      }
    }

    const duplicates = await this.searchDuplicates(command);
    if (duplicates.length > 0 && command.confirmPossibleDuplicate !== true) {
      return {
        ok: false,
        error: domainError('POSSIBLE_DUPLICATE_MASTER', 'Se encontraron posibles duplicados. Revisa antes de confirmar.', true, {
          candidates: duplicates,
        }),
      };
    }

    const master = buildMaster(ctx, command, this.dependencies.createId());
    const savedMaster = await this.dependencies.masters.save(master);
    await this.dependencies.audit.record({
      entityType: command.entityType,
      entityId: savedMaster.id,
      action: 'MASTER_CREATED',
      actorUserId: ctx.actorUserId,
      occurredAt: ctx.now,
      reason: null,
    });

    return { ok: true, value: savedMaster };
  }
}
