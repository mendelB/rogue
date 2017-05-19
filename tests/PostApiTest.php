<?php

use Rogue\Models\Post;
use Illuminate\Foundation\Testing\WithoutMiddleware;

class PostApiTest extends TestCase
{
    use WithoutMiddleware;

    /*
     * Base URL for the Api.
     */
    protected $postsApiUrl = 'api/v2/posts';

    /**
     * Test that a POST request to /posts creates a new photo post.
     *
     * @return void
     */
    public function testCreatingAPost()
    {
        // Create test Post. Temporarily use the current test reportback data
        // array as the requests are the same.
        // Create an uploaded file.
        $file = $this->mockFile();

        $post = [
            'northstar_id'     => str_random(24),
            'campaign_id'      => $this->faker->randomNumber(4),
            'campaign_run_id'  => $this->faker->randomNumber(4),
            'quantity'         => $this->faker->numberBetween(10, 1000),
            'why_participated' => $this->faker->paragraph(3),
            'num_participants' => null,
            'caption'          => $this->faker->sentence(),
            'source'           => 'runscope',
            'remote_addr'      => '207.110.19.130',
            'file'             => $file,
            'crop_x'           => 0,
            'crop_y'           => 0,
            'crop_width'       => 100,
            'crop_height'      => 100,
            'crop_rotate'      => 90,
        ];


        // Mock sending image to AWS.
        Storage::shouldReceive('put')->andReturn(true);

        $response = $this->json('POST', $this->postsApiUrl, $post);

        $this->assertResponseStatus(200);

        $response = $this->decodeResponseJson();

        // Make sure the file_url is saved to the database.
        $this->seeInDatabase('posts', ['url' => $response['data']['media']['url']]);

        $this->seeInDatabase('signups', [
            'id' => $response['data']['signup_id'],
            'quantity' => $post['quantity'],
        ]);
    }

    /**
     * Test that posts get soft deleted when hiting the DELETE endpoint.
     *
     * @return void
     */
    public function testDeletingAPost()
    {
        $post = factory(Post::class)->create();

        $this->json('DELETE', $this->postsApiUrl . '/' . $post->id);

        $this->assertResponseStatus(200);

        // Check that the post record is still in the database
        // Also, check that you can't find it with a `deleted_at` column as null.
        $this->seeInDatabase('posts', [
                'id' => $post->id,
                'url' => null,
            ])->notSeeInDatabase('posts', [
                'id' => $post->id,
                'deleted_at' => null,
            ]);
    }
}
