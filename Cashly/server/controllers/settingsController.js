const supabase = require('../config/supabase');

const clearAllUserData = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get the user's business ID
        const { data: business, error: bError } = await supabase
            .from('businesses')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (bError) throw bError;

        if (!business) {
            return res.status(200).json({
                message: 'No data to clear',
                deleted: { sales: 0, expenses: 0, inventory: 0, receivables: 0 }
            });
        }

        const businessId = business.id;

        // 2. Delete all related data in parallel
        const [
            { count: salesCount },
            { count: expCount },
            { count: invCount },
            { count: recCount },
            { count: insCount },
            { count: alrCount },
            { count: scnCount }
        ] = await Promise.all([
            supabase.from('sales').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('expenses').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('inventory').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('receivables').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('insights').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('alerts').delete({ count: 'exact' }).eq('business_id', businessId),
            supabase.from('scenarios').delete({ count: 'exact' }).eq('business_id', businessId)
        ]);

        console.log(`[PROTOCOLX] Wipe finalized for User: ${userId}, Business: ${businessId}`);

        res.status(200).json({
            message: 'All data cleared successfully',
            deleted: {
                sales: salesCount || 0,
                expenses: expCount || 0,
                inventory: invCount || 0,
                receivables: recCount || 0,
                insights: insCount || 0,
                alerts: alrCount || 0,
                scenarios: scnCount || 0
            }
        });
    } catch (error) {
        console.error('Clear data error:', error);
        res.status(500).json({ message: 'Failed to clear data', error: error.message });
    }
};

module.exports = { clearAllUserData };
