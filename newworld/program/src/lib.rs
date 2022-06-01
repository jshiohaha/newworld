use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod newworld {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn add(ctx: Context<Add>) -> Result<()> {
        msg!("doing some adding");
        Ok(())
    }
}

// new comment
// new comment 2
// new comment 3
// new comment 4
// new comment 5
#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct Add {}
