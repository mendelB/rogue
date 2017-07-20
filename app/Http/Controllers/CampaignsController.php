<?php

namespace Rogue\Http\Controllers;

use Rogue\Models\Signup;
use Rogue\Services\Registrar;
use Rogue\Services\CampaignService;

class CampaignsController extends Controller
{
    /**
     * Registrar instance
     *
     * @var Rogue\Services\Registrar
     */
    protected $registrar;

    /**
     * Phoenix instance
     *
     * @var Rogue\Services\CampaignService
     */
    protected $campaignService;

    /**
     * Constructor
     *
     * @param Rogue\Services\Registrar $registrar
     * @param Rogue\Services\CampaignService $campaignService
     */
    public function __construct(Registrar $registrar, CampaignService $campaignService)
    {
        $this->middleware('auth');
        $this->middleware('role:admin,staff');

        $this->registrar = $registrar;
        $this->campaignService = $campaignService;
    }

    /**
     * Show overview of campaigns.
     */
    public function index()
    {
        $ids = $this->campaignService->getCampaignIdsFromSignups();
        $campaigns = $this->campaignService->findAll($ids);
        $campaigns = $this->campaignService->appendStatusCountsToCampaigns($campaigns);

        $causes = $campaigns ? $this->campaignService->groupByCause($campaigns) : null;

        return view('pages.campaign_overview')
            ->with('state', $causes);
    }

    /**
     * Show particular campaign inbox.
     *
     * @param  int $campaignId
     */
    public function showInbox($campaignId)
    {
        $signups = Signup::campaign([$campaignId])->has('pending')->with('pending')->get();

        // For each pending post, get and include the user
        // @TODO - we should rethink this logic. Making a request to northstar
        // for each post might be heavy. Ideally we could grab/attach users in bulk when
        // we grab the signup.
        $signups->each(function ($item) {
            $item->posts = $item->pending;

            $item->posts->each(function ($item) {
                $user = $this->registrar->find($item->northstar_id);
                $item->user = $user->toArray();
            });
        });

        // Get the campaign data
        $campaignData = $this->campaignService->find($campaignId);

        return view('pages.campaign_inbox')
            ->with('state', [
                'signups' => $signups,
                'campaign' => $campaignData,
            ]);
    }

    /**
     * Show particular campaign and it's posts.
     *
     * @param  int $id
     */
    public function showCampaign($id)
    {
        // @TODO: we should paginate here instead of just showing 100
        $signups = Signup::campaign([$id])->has('posts')->with('posts')->take(100)->get();

        // @TODO EXTRACT AND FIGURE OUT HOW NOT TO HAVE TO DO THIS.
        $signups->each(function ($item) {
            $item->posts->each(function ($item) {
                $user = $this->registrar->find($item->northstar_id);
                $item->user = $user->toArray();
            });
        });

        $campaign = $this->campaignService->find($id);
        $totals = $this->campaignService->getPostTotals($campaign);

        return view('pages.campaign_single')
            ->with('state', [
                'signups' => $signups,
                'campaign' => $campaign,
                'post_totals' => [
                    'accepted_count' => isset($totals->accepted_count) ? $totals->accepted_count : 'n/a',
                    'pending_count' => isset($totals->pending_count) ? $totals->pending_count : 'n/a',
                    'rejected_count' => isset($totals->rejected_count) ? $totals->rejected_count : 'n/a',
                ],
            ]);
    }
}
