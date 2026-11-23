use anchor_lang::prelude::*;

declare_id!("69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3");

pub const MAX_TITLE: usize = 64;
pub const MAX_DESCRIPTION: usize = 280;
pub const MAX_LOCATION: usize = 100;

#[program]
pub mod findchain {
    use super::*;

    pub fn create_item(
        ctx: Context<CreateItem>,
        item_id: u64,
        title: String,
        description: String,
        location: String,
    ) -> Result<()> {
        validate_text(&title, MAX_TITLE, FindChainError::InvalidTitle)?;
        validate_text(
            &description,
            MAX_DESCRIPTION,
            FindChainError::InvalidDescription,
        )?;
        validate_text(&location, MAX_LOCATION, FindChainError::InvalidLocation)?;
        let item = &mut ctx.accounts.item;
        item.authority = ctx.accounts.authority.key();
        item.item_id = item_id;
        item.title = title;
        item.description = description;
        item.location = location;
        item.claimant = None;
        item.status = ItemStatus::Found;
        item.created_at = Clock::get()?.unix_timestamp;
        item.bump = ctx.bumps.item;
        Ok(())
    }

    pub fn update_item(
        ctx: Context<UpdateItem>,
        _item_id: u64,
        title: String,
        description: String,
        location: String,
    ) -> Result<()> {
        validate_text(&title, MAX_TITLE, FindChainError::InvalidTitle)?;
        validate_text(
            &description,
            MAX_DESCRIPTION,
            FindChainError::InvalidDescription,
        )?;
        validate_text(&location, MAX_LOCATION, FindChainError::InvalidLocation)?;
        let item = &mut ctx.accounts.item;
        require!(
            item.status == ItemStatus::Found,
            FindChainError::ItemNotEditable
        );
        item.title = title;
        item.description = description;
        item.location = location;
        Ok(())
    }

    pub fn claim_item(ctx: Context<ClaimItem>, _item_id: u64) -> Result<()> {
        let item = &mut ctx.accounts.item;
        require!(
            item.status == ItemStatus::Found,
            FindChainError::ItemNotClaimable
        );
        require_keys_neq!(
            item.authority,
            ctx.accounts.claimant.key(),
            FindChainError::SelfClaim
        );
        require!(item.claimant.is_none(), FindChainError::AlreadyClaimed);
        item.claimant = Some(ctx.accounts.claimant.key());
        item.status = ItemStatus::Claimed;
        Ok(())
    }

    pub fn mark_returned(ctx: Context<AuthorityItem>, _item_id: u64) -> Result<()> {
        let item = &mut ctx.accounts.item;
        require!(
            item.status == ItemStatus::Claimed,
            FindChainError::ItemNotClaimed
        );
        require!(item.claimant.is_some(), FindChainError::MissingClaimant);
        item.status = ItemStatus::Returned;
        Ok(())
    }

    pub fn close_item(_ctx: Context<CloseItem>, _item_id: u64) -> Result<()> {
        Ok(())
    }
}

fn validate_text(value: &str, max: usize, error: FindChainError) -> Result<()> {
    if value.trim().is_empty() || value.as_bytes().len() > max {
        return Err(error.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct CreateItem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + Item::INIT_SPACE, seeds = [b"item", authority.key().as_ref(), &item_id.to_le_bytes()], bump)]
    pub item: Account<'info, Item>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct UpdateItem<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"item", authority.key().as_ref(), &item_id.to_le_bytes()], bump = item.bump, has_one = authority)]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct ClaimItem<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(mut, seeds = [b"item", item.authority.as_ref(), &item_id.to_le_bytes()], bump = item.bump)]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct AuthorityItem<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"item", authority.key().as_ref(), &item_id.to_le_bytes()], bump = item.bump, has_one = authority)]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct CloseItem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, close = authority, seeds = [b"item", authority.key().as_ref(), &item_id.to_le_bytes()], bump = item.bump, has_one = authority, constraint = item.status == ItemStatus::Returned @ FindChainError::ItemNotReturned)]
    pub item: Account<'info, Item>,
}

#[account]
#[derive(InitSpace)]
pub struct Item {
    pub authority: Pubkey,
    pub item_id: u64,
    #[max_len(64)]
    pub title: String,
    #[max_len(280)]
    pub description: String,
    #[max_len(100)]
    pub location: String,
    pub claimant: Option<Pubkey>,
    pub status: ItemStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ItemStatus {
    Found,
    Claimed,
    Returned,
}

#[error_code]
pub enum FindChainError {
    #[msg("Title is empty or exceeds 64 bytes")]
    InvalidTitle,
    #[msg("Description is empty or exceeds 280 bytes")]
    InvalidDescription,
    #[msg("Location is empty or exceeds 100 bytes; use a general location")]
    InvalidLocation,
    #[msg("Item is no longer editable")]
    ItemNotEditable,
    #[msg("Item cannot be claimed in its current state")]
    ItemNotClaimable,
    #[msg("The finder cannot claim their own item")]
    SelfClaim,
    #[msg("Item has already been claimed")]
    AlreadyClaimed,
    #[msg("Item must be claimed before it can be returned")]
    ItemNotClaimed,
    #[msg("A claimant must be recorded before return")]
    MissingClaimant,
    #[msg("Only returned items can be closed")]
    ItemNotReturned,
}
